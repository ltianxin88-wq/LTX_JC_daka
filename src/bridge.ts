import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Config } from './config.js'
import type { BridgeCommand, BridgeResponse, ConfigurationUpdate, ConfigurationView, ManagementAnalyticsFilter, ManagementAnalyticsPersonView, ManagementAnalyticsView, ManagementRunView, PersonalAccountUpdate, PersonalAttendanceView, PersonalAutomationView, PersonalMakeupSubmit, PersonalMakeupView, PersonalReminderDeliveryComplete, PersonalReminderDeliveryReservation, PersonalReminderDeliveryReserve, PersonalReminderSettingsUpdate, PersonalRosterUpdate, PersonalRosterView, PersonalScheduleUpdate, PersonalStartupClaim, PersonalStartupClaimResult, ReadCommand, RosterTableView, RosterUpdate, RuntimePreparationView } from './contracts.js'
import { prepareRuntime, RuntimeBootstrapError, type RuntimeBootstrapResult } from './runtime-bootstrap.js'

const MAX_STDOUT_BYTES = 2 * 1024 * 1024
const MAX_STDERR_BYTES = 16 * 1024

export class AttendanceBridge {
  readonly bridgePath: string
  readonly requirementsPath: string
  private runtime: Promise<RuntimeBootstrapResult> | undefined
  private runtimeStatus: RuntimePreparationView = { phase: 'idle', progress: 0, detail: '等待准备运行环境', updatedAt: new Date().toISOString() }

  constructor(private readonly config: Config) {
    const bundledRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../backend')
    this.bridgePath = resolve(bundledRoot, 'iepms_bridge.py')
    this.requirementsPath = resolve(bundledRoot, 'requirements.txt')
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

  readRuntimeStatus(): RuntimePreparationView {
    return this.runtimeStatus
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

  async readManagementAnalytics(settings: ManagementAnalyticsFilter): Promise<ManagementAnalyticsView> {
    const response = await this.invoke('management-analytics-read', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '考勤运营分析读取失败。')
    return response.data as ManagementAnalyticsView
  }

  async readManagementAnalyticsPerson(settings: ManagementAnalyticsFilter): Promise<ManagementAnalyticsPersonView> {
    const response = await this.invoke('management-analytics-person-read', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '人员考勤详情读取失败。')
    return response.data as ManagementAnalyticsPersonView
  }

  async updatePersonalSchedule(settings: PersonalScheduleUpdate): Promise<PersonalAutomationView> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke('personal-schedule-update', settings)
    if (!response.ok || response.data === undefined) {
      throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人定时巡检保存失败。')
    }
    return response.data as PersonalAutomationView
  }

  async updatePersonalReminderSettings(settings: PersonalReminderSettingsUpdate): Promise<PersonalAutomationView> {
    const response = await this.invoke('personal-reminder-settings-update', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人提醒配置保存失败。')
    return response.data as PersonalAutomationView
  }

  async reservePersonalReminder(settings: PersonalReminderDeliveryReserve): Promise<PersonalReminderDeliveryReservation> {
    const response = await this.invoke('personal-reminder-delivery-reserve', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '提醒去重状态保存失败。')
    return response.data as PersonalReminderDeliveryReservation
  }

  async completePersonalReminder(settings: PersonalReminderDeliveryComplete): Promise<void> {
    const response = await this.invoke('personal-reminder-delivery-complete', settings)
    if (!response.ok) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '提醒投递状态保存失败。')
  }

  async claimPersonalStartup(settings: PersonalStartupClaim): Promise<PersonalStartupClaimResult> {
    const response = await this.invoke('personal-startup-claim', settings)
    if (!response.ok || response.data === undefined) throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '启动巡检去重状态保存失败。')
    return response.data as PersonalStartupClaimResult
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

  private async invoke(command: BridgeCommand, settings?: ConfigurationUpdate | ManagementAnalyticsFilter | PersonalAccountUpdate | PersonalScheduleUpdate | PersonalReminderSettingsUpdate | PersonalReminderDeliveryReserve | PersonalReminderDeliveryComplete | PersonalStartupClaim | PersonalMakeupSubmit | RosterUpdate | PersonalRosterUpdate | Record<string, never>): Promise<BridgeResponse<unknown>> {
    const runtime = await this.prepareRuntime()
    return new Promise((resolveResult, reject) => {
      const child = spawn(runtime.pythonPath, [this.bridgePath], {
        cwd: this.config.dataRoot,
        env: { ...runtime.environment, IEPMS_PLUGIN_DATA_ROOT: this.config.dataRoot, IEPMS_LEGACY_IMPORT_ROOT: this.config.legacyImportRoot, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
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

  private prepareRuntime(): Promise<RuntimeBootstrapResult> {
    if (this.runtime === undefined) {
      this.runtime = prepareRuntime({
        pythonPath: this.config.pythonPath,
        dataRoot: this.config.dataRoot,
        requirementsPath: this.requirementsPath,
        packageIndexUrl: this.config.pythonPackageIndex,
        onProgress: status => { this.runtimeStatus = status },
      }).catch(error => {
        this.runtime = undefined
        this.runtimeStatus = { phase: 'error', progress: this.runtimeStatus.progress, detail: '运行环境准备失败', updatedAt: new Date().toISOString() }
        if (error instanceof RuntimeBootstrapError) throw new BridgeError('RUNTIME_PREPARATION_FAILED', error.message)
        throw new BridgeError('RUNTIME_PREPARATION_FAILED', 'iEPMS 运行环境准备失败。')
      })
    }
    return this.runtime
  }
}

export class BridgeError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}
