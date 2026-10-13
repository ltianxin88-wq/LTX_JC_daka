export const PLUGIN_ID = 'iepms-attendance-plugin'
export const API_PREFIX = '/iepms-attendance-local/v1'
export const CLIENT_HEADER = 'x-iepms-attendance-client'
export const CLIENT_NAME = 'dashboard-web'

export type ReadCommand = 'status' | 'roster-summary' | 'roster-read' | 'personal-roster-read' | 'recent-runs' | 'schedule-status' | 'configuration-read' | 'personal-attendance' | 'personal-automation-read' | 'personal-makeup-read'
export type BridgeCommand = ReadCommand | 'configuration-update' | 'roster-update' | 'personal-roster-update' | 'personal-account-update' | 'personal-run-start' | 'personal-schedule-update' | 'personal-makeup-submit'

export interface BridgeResponse<T> {
  ok: boolean
  schemaVersion: 1
  command: BridgeCommand
  data?: T
  error?: { code: string; message: string }
}

export interface StatusView {
  application: { name: string; version: string; dataRootAvailable: boolean }
  configuration: { fileAvailable: boolean; valid: boolean; accountConfigured: boolean; webhookConfigured: boolean; browserConfigured: boolean }
  data: { rosterAvailable: boolean; logAvailable: boolean; lastDataAvailable: boolean }
  safety: { mode: 'read-only'; automaticActionsEnabled: false }
}

export interface RosterView { projectCount: number; personCount: number; rosterAvailable: boolean }
export interface RosterRow {
  rowId: string
  projectName: string
  projectCode: string
  name: string
  city: string
  account: string
  mobile: string
  dingtalkId: string
  webhookConfigured: boolean
  webhook?: string
}
export interface RosterTableView { rows: RosterRow[]; backupAvailable: boolean }
export interface RosterUpdate { rows: RosterRow[] }
export interface PersonalRosterView { configured: boolean; row: RosterRow | null; duplicateCount: number }
export interface PersonalRosterUpdate { row: RosterRow }
export interface ScheduleTaskView { name: string; state: 'ready' | 'running' | 'disabled' | 'unknown' }
export interface ScheduleView { supported: boolean; tasks: ScheduleTaskView[]; message?: string }
export interface RecentRunView { timestamp: string; level: 'ok' | 'warning' | 'error' | 'info'; summary: string }

export interface ConfigurationView {
  accountConfigured: boolean
  accountMasked: string
  passwordConfigured: boolean
  webhookConfigured: boolean
  browserChannel: 'chrome' | 'chromium' | 'msedge'
  overnightExemptAttendance: boolean
  overnightCheckWorkHours: boolean
}

export interface ConfigurationUpdate {
  username?: string
  password?: string
  defaultWebhook?: string
  browserChannel?: ConfigurationView['browserChannel']
  overnightExemptAttendance?: boolean
  overnightCheckWorkHours?: boolean
}

export interface PersonalAccountUpdate {
  account: string
}

export interface PersonalScheduleUpdate {
  enabled: boolean
  times: string[]
}

export interface PersonalAutomationView {
  state: 'idle' | 'running' | 'success' | 'error'
  lastRunAt: string
  lastCompletedAt: string
  message: string
  accountConfigured: boolean
  loginReady: boolean
  schedule: { enabled: boolean; times: string[] }
}

export type PersonalAttendanceStatus = 'normal' | 'late' | 'early' | 'missing' | 'checked-in' | 'pending'

export interface PersonalAttendanceRecord {
  date: string
  clockIn: string
  clockOut: string
  workMinutes: number | null
  status: PersonalAttendanceStatus
}

export interface PersonalAttendanceView {
  configured: boolean
  accountMasked: string
  records: PersonalAttendanceRecord[]
  source: { latestAvailable: boolean; historyDays: number }
}

export type PersonalMakeupMode = 'makeup' | 'overtime' | 'submitted'
export interface PersonalMakeupApplication {
  kind: 'makeup' | 'overtime'
  overtimeDate: string
  reason: string
  status: 'local-pending'
  createdAt: string
}
export interface PersonalMakeupItem {
  attendanceDate: string
  mode: PersonalMakeupMode
  deadline: string
  message: string
  overtimeReminderDates: string[]
  application?: PersonalMakeupApplication
}
export interface PersonalMakeupView { configured: boolean; items: PersonalMakeupItem[] }
export interface PersonalMakeupSubmit { attendanceDate: string; overtimeDate?: string; reason?: string }

export interface DashboardSnapshot {
  status: StatusView
  roster: RosterView
  schedule: ScheduleView
  recentRuns: RecentRunView[]
}
