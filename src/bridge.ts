import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Config } from './config.js'
import type { BridgeCommand, BridgeResponse, ConfigurationUpdate, ConfigurationView, ManagementRunView, PersonalAccountUpdate, PersonalAttendanceView, PersonalAutomationView, PersonalMakeupSubmit, PersonalMakeupView, PersonalRosterUpdate, PersonalRosterView, PersonalScheduleUpdate, ReadCommand, RosterTableView, RosterUpdate } from './contracts.js'

const MAX_STDOUT_BYTES = 2 * 1024 * 1024
const MAX_STDERR_BYTES = 16 * 1024

export class AttendanceBridge {
  readonly bridgePath: string

  constructor(private readonly config: Config) {
    const bundledBridge = resolve(dirname(fileURLToPath(import.meta.url)), '../backend/iepms_bridge.py')
    this.bridgePath = bundledBridge
    mkdirSync(config.dataRoot, { recursive: true })
  }

  async read<T>(command: ReadCommand): Promise<T> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke(command)
    if (!response.ok || response.data === undefined) {
      const message = response.error?.message ?? 'iEPMS 本地桥接程序未返回可用数据。'
      throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', message)
    }
    return response.data as T
  }

  async updateConfiguration(settings: ConfigurationUpdate): Promise<ConfigurationView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('configuration-update', settings)
    if (!response.ok || response.data === undefined) {
      throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '本地配置保存失败。')
    }
    return response.data as ConfigurationView
  }

  async updatePersonalAccount(settings: PersonalAccountUpdate): Promise<PersonalAttendanceView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('personal-account-update', settings)
    if (!response.ok || response.data === undefined) {
      throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人账号保存失败。')
    }
    return response.data as PersonalAttendanceView
  }

  async startPersonalRun(): Promise<PersonalAutomationView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('personal-run-start', {})
    if (!response.ok || response.data === undefined) {
      throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人巡检启动失败。')
    }
    return response.data as PersonalAutomationView
  }

  async startManagementRun(): Promise<ManagementRunView> {
    const response = await this.invoke('management-run-start', {})
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '管理巡检启动失败。')
    return response.data as ManagementRunView
  }

  async updatePersonalSchedule(settings: PersonalScheduleUpdate): Promise<PersonalAutomationView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('personal-schedule-update', settings)
    if (!response.ok || response.data === undefined) {
      throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人定时巡检保存失败。')
    }
    return response.data as PersonalAutomationView
  }

  async updateRoster(settings: RosterUpdate): Promise<RosterTableView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('roster-update', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '花名册保存失败。')
    return response.data as RosterTableView
  }

  async updatePersonalRoster(settings: PersonalRosterUpdate): Promise<PersonalRosterView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('personal-roster-update', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人资料保存失败。')
    return response.data as PersonalRosterView
  }

  async submitPersonalMakeup(settings: PersonalMakeupSubmit): Promise<PersonalMakeupView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('personal-makeup-submit', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '补卡申请保存失败。')
    return response.data as PersonalMakeupView
  }

  private invoke(command: BridgeCommand, settings?: ConfigurationUpdate | PersonalAccountUpdate | PersonalScheduleUpdate | PersonalMakeupSubmit | RosterUpdate | PersonalRosterUpdate | Record<string, never>): Promise<BridgeResponse<unknown>> {
    return new Promise((resolveResult, reject) => {
      const child = spawn(this.config.pythonPath, [this.bridgePath], {
        cwd: this.config.dataRoot,
        env: { ...process.env, IEPMS_PLUGIN_DATA_ROOT: this.config.dataRoot, IEPMS_LEGACY_IMPORT_ROOT: this.config.legacyImportRoot, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      let settled = false
      const finish = (callback: () => void): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        callback()
      }
      const timer = setTimeout(() => {
        child.kill()
        finish(() => reject(new BridgeError('BRIDGE_TIMEOUT', '读取 iEPMS 状态超时。')))
      }, this.config.bridgeTimeoutMs)
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', chunk => { if (stdout.length < MAX_STDOUT_BYTES) stdout += chunk })
      child.stderr.on('data', chunk => { if (stderr.length < MAX_STDERR_BYTES) stderr += chunk })
      child.on('error', () => finish(() => reject(new BridgeError('PYTHON_UNAVAILABLE', '无法启动配置的 Python 运行时。'))))
      child.on('close', code => finish(() => {
        try {
          const parsed = JSON.parse(stdout) as BridgeResponse<unknown>
          if (parsed.schemaVersion !== 1 || parsed.command !== command || typeof parsed.ok !== 'boolean') throw new Error()
          resolveResult(parsed)
        } catch {
          const message = code === 0
            ? 'iEPMS 本地桥接程序返回了无效数据。'
            : 'iEPMS 本地桥接程序执行失败。'
          reject(new BridgeError(code === 0 ? 'BRIDGE_PROTOCOL_INVALID' : 'BRIDGE_PROCESS_FAILED', message))
        }
      }))
      child.stdin.end(JSON.stringify(settings === undefined ? { version: 1, command } : { version: 1, command, settings }))
    })
  }
}

export class BridgeError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}
