import type { Context } from '@deepseek-ai/cordis'
import { registerAttendanceApi } from './api.js'
import { AttendanceBridge } from './bridge.js'
import { Config as ConfigSchema, resolveConfig, type Config as AttendanceConfig } from './config.js'
import { createPersonalInspectionService, PERSONAL_INSPECTION_SERVICE } from './personal-inspection-service.js'
import { installPetAttendanceIntegration } from './pet-integration.js'
import type { RuntimeContextLike } from './runtime.js'

export const name = 'iepms-attendance-plugin'
export const inject = ['webServer']
export const Config = ConfigSchema
export type Config = AttendanceConfig

export function apply(ctx: Context, config: AttendanceConfig): void {
  const runtime = ctx as unknown as RuntimeContextLike
  const resolved = resolveConfig(config)
  const bridge = new AttendanceBridge(resolved)
  const inspection = createPersonalInspectionService(bridge)
  // Keep the startup-only entry private to this plugin. Other plugins, PET
  // included, receive only the explicitly user-initiated public surface.
  runtime.provide?.(PERSONAL_INSPECTION_SERVICE, {
    start: inspection.start,
    status: inspection.status,
  })
  runtime.effect(() => installPetAttendanceIntegration(runtime, inspection), 'iepms-attendance-plugin.pet')
  runtime.effect(() => {
    const dispose = registerAttendanceApi(runtime, bridge)
    runtime.logger.info('iepms-attendance-plugin: local dashboard and secure configuration API registered')
    return dispose
  }, 'iepms-attendance-plugin.api')
}
