import { randomUUID } from 'node:crypto'
import type { PersonalInspectionInternalService, PersonalInspectionResult } from './personal-inspection-service.js'
import type { RuntimeContextLike } from './runtime.js'

const PET_SOURCE = 'iepms-attendance'
const ACTION_ID = 'attendance-check'
const ANNOUNCEMENT_TTL_MS = 30 * 60 * 1000
const POLL_INTERVAL_MS = 1000
const MAX_POLLS = 60

export interface PetIntegrationLike {
  announce(input: unknown): { ok: boolean }
  registerPanelAction(action: {
    id: string
    label: string
    title?: string
    order?: number
    onSelect: () => void | Promise<void>
  }): () => void
}

export interface PetIntegrationOptions {
  pollIntervalMs?: number
  maxPolls?: number
  wait?: (milliseconds: number) => Promise<void>
}

/**
 * Connect the optional PET surface to the attendance plugin. The returned
 * disposer removes the button; PET never receives the bridge or raw records.
 * Startup inspection is also attempted here and is a no-op without a saved
 * personal account.
 */
export function installPetAttendanceIntegration(
  runtime: RuntimeContextLike,
  service: PersonalInspectionInternalService,
  options: PetIntegrationOptions = {},
): () => void {
  const pet = readOptionalPet(runtime)
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>(resolve => { setTimeout(resolve, milliseconds) }))
  const pollIntervalMs = Math.max(0, options.pollIntervalMs ?? POLL_INTERVAL_MS)
  const maxPolls = Math.max(1, options.maxPolls ?? MAX_POLLS)
  let disposed = false
  let running = false
  const announce = (result: PersonalInspectionResult | undefined, progress?: number): void => {
    if (pet === undefined || result === undefined) return
    pet.announce(toPetAnnouncement(result, progress))
  }
  const execute = async (starter: () => Promise<PersonalInspectionResult | undefined>): Promise<void> => {
    if (disposed || running) {
      if (running) announce({ operationId: 'busy', state: 'running', message: '正在检查今日个人打卡状态。' })
      return
    }
    running = true
    try {
      const initial = await starter()
      if (initial === undefined) return
      announce(initial, initial.state === 'success' ? 100 : 10)
      let result = initial
      for (let index = 0; index < maxPolls && !disposed && (result.state === 'accepted' || result.state === 'running'); index += 1) {
        await wait(pollIntervalMs)
        if (disposed) return
        result = await service.status(initial.operationId)
        const progress = result.state === 'success' ? 100 : 10 + Math.round(((index + 1) / maxPolls) * 85)
        announce(result, Math.min(95, progress))
      }
      if (result.state === 'accepted' || result.state === 'running') {
        announce({ ...result, state: 'error', message: '个人巡检仍在执行，暂时无法确认打卡状态。' })
      }
    } catch {
      announce({ operationId: 'error', state: 'error', message: '个人巡检失败，暂时无法确认打卡状态。' })
    } finally {
      running = false
    }
  }

  let disposeAction = (): void => {}
  if (pet !== undefined) {
    disposeAction = pet.registerPanelAction({
      id: ACTION_ID,
      label: '检查打卡',
      title: '主动查询今日个人打卡状态',
      order: 100,
      onSelect: () => execute(() => service.start({ userInitiated: true, requestId: `pet-panel-${randomUUID()}` })),
    })
  }
  void execute(() => service.startAutomatic())
  return () => {
    disposed = true
    disposeAction()
  }
}

function readOptionalPet(runtime: RuntimeContextLike): PetIntegrationLike | undefined {
  try {
    const value = runtime.get('pet', false)
    if (value === null || typeof value !== 'object') return undefined
    const pet = value as Partial<PetIntegrationLike>
    if (typeof pet.announce !== 'function' || typeof pet.registerPanelAction !== 'function') return undefined
    return pet as PetIntegrationLike
  } catch {
    return undefined
  }
}

export function toPetAnnouncement(result: PersonalInspectionResult, progress?: number): Record<string, unknown> {
  if (result.state === 'running' || result.state === 'accepted') {
    return { source: PET_SOURCE, kind: 'plan', title: '考勤巡检', percent: clampProgress(progress ?? 10), note: '正在检查今日个人打卡状态。', tone: 'warn', ttlMs: 10_000 }
  }
  if (result.state === 'error') {
    return { source: PET_SOURCE, kind: 'plan', title: '考勤巡检', percent: clampProgress(progress ?? 0), note: '暂时无法确认打卡状态，请稍后重试。', tone: 'low', ttlMs: ANNOUNCEMENT_TTL_MS }
  }
  const status = result.attendance?.status
  const note = status === 'normal'
    ? '今日打卡正常。'
    : status === 'missing'
      ? '今日尚未查询到上班打卡，请确认是否已完成打卡。'
      : status === 'checked-in'
        ? '已查询到上班打卡，尚未查询到下班打卡。'
        : status === 'late'
          ? '今日存在迟到记录，请留意考勤状态。'
          : status === 'early'
            ? '今日存在早退记录，请留意考勤状态。'
            : status === 'not-scheduled'
              ? '今日非工作日，无需打卡。'
              : '暂时无法确认打卡状态，请稍后重试。'
  const tone = status === 'normal' || status === 'not-scheduled' ? 'ok' : status === 'unknown' ? 'low' : 'warn'
  return { source: PET_SOURCE, kind: 'plan', title: '考勤提醒', percent: 100, note, tone, ttlMs: ANNOUNCEMENT_TTL_MS }
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
