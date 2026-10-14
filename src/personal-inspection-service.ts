import type { AttendanceBridge } from './bridge.js'
import type { PersonalAttendanceView, PersonalAutomationView } from './contracts.js'
import { randomUUID } from 'node:crypto'

export const PERSONAL_INSPECTION_SERVICE = 'iepmsAttendancePersonalInspection'

export type PersonalInspectionState = 'accepted' | 'running' | 'success' | 'error'
export type PersonalInspectionAttendance = 'normal' | 'late' | 'early' | 'missing' | 'checked-in' | 'pending' | 'not-scheduled' | 'unknown'

export interface PersonalInspectionStartRequest {
  userInitiated: true
  requestId: string
}

export interface PersonalInspectionResult {
  operationId: string
  state: PersonalInspectionState
  message: string
  attendance?: {
    date: string
    status: PersonalInspectionAttendance
  }
}

export interface PersonalInspectionService {
  start(request: PersonalInspectionStartRequest): Promise<PersonalInspectionResult>
  status(operationId: string): Promise<PersonalInspectionResult>
}

/** Internal entry used by the attendance plugin's startup lifecycle only. */
export interface PersonalInspectionInternalService extends PersonalInspectionService {
  startAutomatic(): Promise<PersonalInspectionResult | undefined>
}

interface InspectionBridge {
  startPersonalRun(): Promise<PersonalAutomationView>
  read<T>(command: 'personal-automation-read' | 'personal-attendance'): Promise<T>
}

const REQUEST_ID_MAX_LENGTH = 128
const OPERATION_TTL_MS = 30 * 60 * 1000

export function createPersonalInspectionService(bridge: InspectionBridge | AttendanceBridge): PersonalInspectionInternalService {
  const operations = new Map<string, { requestId: string; startedAt: number }>()
  const requestOperations = new Map<string, { operationId: string; createdAt: number }>()

  const cleanup = (): void => {
    const cutoff = Date.now() - OPERATION_TTL_MS
    for (const [operationId, operation] of operations) if (operation.startedAt < cutoff) operations.delete(operationId)
    for (const [requestId, operation] of requestOperations) if (operation.createdAt < cutoff) requestOperations.delete(requestId)
  }

  const readStatus = async (operationId: string): Promise<PersonalInspectionResult> => {
    cleanup()
    const operation = operations.get(operationId)
    if (operation === undefined) return { operationId, state: 'error', message: '个人巡检操作不存在或已过期。' }
    const automation = await bridge.read<PersonalAutomationView>('personal-automation-read')
    const state = automation.state === 'success' ? 'success' : automation.state === 'error' ? 'error' : 'running'
    if (state !== 'success') return { operationId, state, message: sanitizeMessage(automation.message, state) }
    const attendance = await readTodayAttendance(bridge)
    return { operationId, state, message: '个人巡检已完成。', ...(attendance === undefined ? {} : { attendance }) }
  }

  const startWithOperation = async (requestId: string): Promise<PersonalInspectionResult> => {
    const operationId = createOperationId()
    requestOperations.set(requestId, { operationId, createdAt: Date.now() })
    operations.set(operationId, { requestId, startedAt: Date.now() })
    try {
      const automation = await bridge.startPersonalRun()
      const state = automation.state === 'error' ? 'error' : 'running'
      return { operationId, state, message: sanitizeMessage(automation.message, state) }
    } catch (error) {
      operations.delete(operationId)
      requestOperations.delete(requestId)
      throw error
    }
  }

  return {
    async start(request) {
      cleanup()
      validateStartRequest(request)
      const previous = requestOperations.get(request.requestId)
      if (previous !== undefined) return readStatus(previous.operationId)
      return startWithOperation(request.requestId)
    },
    status: readStatus,
    async startAutomatic() {
      cleanup()
      const attendance = await bridge.read<PersonalAttendanceView>('personal-attendance')
      if (!attendance.configured) return undefined
      const automation = await bridge.read<PersonalAutomationView>('personal-automation-read')
      if (!automation.schedule.enabled) return undefined
      return startWithOperation(`startup-${localDate()}`)
    },
  }
}

function validateStartRequest(request: PersonalInspectionStartRequest): void {
  if (request === null || typeof request !== 'object' || request.userInitiated !== true || typeof request.requestId !== 'string') {
    throw new Error('个人立即巡检必须由用户按钮触发。')
  }
  const requestId = request.requestId.trim()
  if (requestId.length === 0 || requestId.length > REQUEST_ID_MAX_LENGTH) throw new Error('个人立即巡检请求标识无效。')
}

function createOperationId(): string {
  return `personal-${randomUUID()}`
}

function sanitizeMessage(message: string, state: 'running' | 'error'): string {
  const fallback = state === 'error' ? '个人巡检失败。' : '正在同步个人考勤记录。'
  const value = message.trim().replace(/[\r\n]+/gu, ' ').slice(0, 160)
  return value || fallback
}

async function readTodayAttendance(bridge: InspectionBridge): Promise<PersonalInspectionResult['attendance']> {
  const view = await bridge.read<PersonalAttendanceView>('personal-attendance')
  if (!view.configured) return { date: localDate(), status: 'unknown' }
  const date = localDate()
  const record = view.records.find(item => item.date === date)
  if (record !== undefined) return { date, status: record.status }
  if (view.calendar.workdays.includes(date)) return { date, status: 'missing' }
  return { date, status: 'not-scheduled' }
}

function localDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
