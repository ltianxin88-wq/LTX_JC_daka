export const PLUGIN_ID = 'iepms-attendance-plugin'
export const API_PREFIX = '/iepms-attendance-local/v1'
export const CLIENT_HEADER = 'x-iepms-attendance-client'
export const CLIENT_NAME = 'dashboard-web'
export const MANAGEMENT_HEADER = 'x-iepms-attendance-management'

export interface ManagementAuthorizationView { token: string; expiresAt: string }

export type ReadCommand = 'status' | 'roster-summary' | 'roster-read' | 'personal-roster-read' | 'recent-runs' | 'schedule-status' | 'configuration-read' | 'personal-attendance' | 'personal-automation-read' | 'personal-makeup-read' | 'management-run-read' | 'management-log-read'
export type AnalyticsReadCommand = 'management-analytics-read' | 'management-analytics-person-read'
export type BridgeCommand = ReadCommand | AnalyticsReadCommand | 'configuration-update' | 'roster-update' | 'personal-roster-update' | 'personal-account-update' | 'personal-run-start' | 'personal-schedule-update' | 'personal-reminder-settings-update' | 'personal-reminder-delivery-reserve' | 'personal-reminder-delivery-complete' | 'personal-startup-claim' | 'personal-makeup-submit' | 'management-run-start'

export interface BridgeResponse<T> {
  ok: boolean
  schemaVersion: 1
  command: BridgeCommand
  data?: T
  error?: { code: string; message: string }
}

export type RuntimePreparationPhase = 'idle' | 'checking-python' | 'creating-environment' | 'checking-dependencies' | 'installing-dependencies' | 'verifying' | 'ready' | 'error'
export interface RuntimePreparationView {
  phase: RuntimePreparationPhase
  progress: number
  detail: string
  updatedAt: string
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

export type PersonalShiftType = 'day' | 'night' | 'flexible' | 'off'
export interface PersonalReminderSettings {
  startupInspection: boolean
  usePet: boolean
  fallbackNotification: boolean
  nightSafety: boolean
  shiftType: PersonalShiftType
}
export interface PersonalReminderSettingsUpdate extends PersonalReminderSettings {}
export type AttendanceReminderType = 'missing-clock-in' | 'missing-clock-out' | 'makeup-window' | 'night-safety' | 'sync-failed'
export type AttendanceReminderChannel = 'pet' | 'desktop' | 'plugin'
export interface PersonalReminderDeliveryView {
  eventId: string
  type: AttendanceReminderType
  channel: AttendanceReminderChannel
  status: 'pending' | 'delivered' | 'failed'
  deliveredAt: string
}
export interface PersonalReminderDeliveryReserve {
  eventId: string
  attendanceDate: string
  type: AttendanceReminderType
  channel: AttendanceReminderChannel
  expiresAt: string
}
export interface PersonalReminderDeliveryReservation { allowed: boolean; duplicateOf?: string }
export interface PersonalReminderDeliveryComplete {
  eventId: string
  channel: AttendanceReminderChannel
  status: 'delivered' | 'failed'
}
export interface PersonalStartupClaim { attendanceDate: string }
export interface PersonalStartupClaimResult { claimed: boolean }

export interface PersonalAutomationView {
  state: 'idle' | 'running' | 'success' | 'error'
  lastRunAt: string
  lastCompletedAt: string
  message: string
  accountConfigured: boolean
  loginReady: boolean
  schedule: { enabled: boolean; times: string[] }
  reminders: PersonalReminderSettings
  lastReminder: PersonalReminderDeliveryView | null
}

export interface ManagementRunView {
  state: 'idle' | 'running' | 'success' | 'error'
  lastRunAt: string
  lastCompletedAt: string
  message: string
}
export type AttendanceGrade = '优秀' | '良好' | '待关注' | '异常较多' | '暂无数据'
export interface ManagementAnalyticsFilter { month: string; name?: string; group?: string; page?: number; pageSize?: number; sortBy?: 'name' | 'expected' | 'actual' | 'normal' | 'missing' | 'madeUp' | 'pending' | 'expired' | 'late' | 'early' | 'rate' | 'grade'; sortDirection?: 'asc' | 'desc'; personKey?: string }
export interface ManagementAnalyticsRow { personKey: string; name: string; group: string; city: string; expectedDays: number; actualDays: number; normalCount: number; missingCount: number; madeUpCount: number; pendingMakeupCount: number; expiredMissingCount: number; lateCount: number; earlyCount: number; attendanceRate: number; grade: AttendanceGrade }
export interface ManagementAnalyticsView { month: string; coverage: { coveredWorkdays: number; firstDate: string; lastDate: string }; metrics: { personCount: number; attendanceRate: number; missingCount: number; pendingMakeupCount: number }; trend: { date: string; missingCount: number; pendingCount: number }[]; ranking: { name: string; group: string; missingCount: number }[]; gradeDistribution: { grade: Exclude<AttendanceGrade, '暂无数据'>; count: number }[]; groups: string[]; pagination: { page: number; pageSize: number; total: number }; rows: ManagementAnalyticsRow[] }
export interface ManagementAnalyticsPersonView { month: string; person: ManagementAnalyticsRow; records: { date: string; clockIn: string; clockOut: string; workMinutes: number | null; status: PersonalAttendanceStatus; resolution?: 'made-up' | 'pending' | 'expired' }[]; anomalies: { date: string; clockIn: string; clockOut: string; workMinutes: number | null; status: PersonalAttendanceStatus; resolution?: 'made-up' | 'pending' | 'expired' }[] }

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
  calendar: { workdays: string[] }
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
