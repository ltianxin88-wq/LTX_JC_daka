import type { Context } from '@deepseek-ai/cordis'
import { registerAttendanceApi } from './api.js'
import { AttendanceBridge } from './bridge.js'
import { Config as ConfigSchema, resolveConfig, type Config as AttendanceConfig } from './config.js'
import type { RuntimeContextLike } from './runtime.js'

export const name = 'iepms-attendance-plugin'
export const inject = ['webServer']
export const Config = ConfigSchema
export type Config = AttendanceConfig

export function apply(ctx: Context, config: AttendanceConfig): void {
  const runtime = ctx as unknown as RuntimeContextLike
  const resolved = resolveConfig(config)
  const bridge = new AttendanceBridge(resolved)
  runtime.effect(() => {
    const dispose = registerAttendanceApi(runtime, bridge)
    runtime.logger.info('iepms-attendance-plugin: read-only local dashboard API registered')
    return dispose
  }, 'iepms-attendance-plugin.api')
}
