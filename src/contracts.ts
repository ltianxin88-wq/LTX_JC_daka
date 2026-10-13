export const PLUGIN_ID = 'iepms-attendance-plugin'
export const API_PREFIX = '/iepms-attendance-local/v1'
export const CLIENT_HEADER = 'x-iepms-attendance-client'
export const CLIENT_NAME = 'dashboard-web'

export type ReadCommand = 'status' | 'roster-summary' | 'recent-runs' | 'schedule-status'

export interface BridgeResponse<T> {
  ok: boolean
  schemaVersion: 1
  command: ReadCommand
  data?: T
  error?: { code: string; message: string }
}

export interface StatusView {
  application: { name: string; version: string; backendRootAvailable: boolean }
  configuration: { fileAvailable: boolean; valid: boolean; accountConfigured: boolean; webhookConfigured: boolean; browserConfigured: boolean }
  data: { rosterAvailable: boolean; logAvailable: boolean; lastDataAvailable: boolean }
  safety: { mode: 'read-only'; automaticActionsEnabled: false }
}

export interface RosterView { projectCount: number; personCount: number; rosterAvailable: boolean }
export interface ScheduleTaskView { name: string; state: 'ready' | 'running' | 'disabled' | 'unknown' }
export interface ScheduleView { supported: boolean; tasks: ScheduleTaskView[]; message?: string }
export interface RecentRunView { timestamp: string; level: 'ok' | 'warning' | 'error' | 'info'; summary: string }

export interface DashboardSnapshot {
  status: StatusView
  roster: RosterView
  schedule: ScheduleView
  recentRuns: RecentRunView[]
}
