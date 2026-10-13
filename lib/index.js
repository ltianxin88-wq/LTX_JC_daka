import { registerAttendanceApi } from './api.js';
import { AttendanceBridge } from './bridge.js';
import { Config as ConfigSchema, resolveConfig } from './config.js';
export const name = 'iepms-attendance-plugin';
export const inject = ['webServer'];
export const Config = ConfigSchema;
export function apply(ctx, config) {
    const runtime = ctx;
    const resolved = resolveConfig(config);
    const bridge = new AttendanceBridge(resolved);
    runtime.effect(() => {
        const dispose = registerAttendanceApi(runtime, bridge);
        runtime.logger.info('iepms-attendance-plugin: read-only local dashboard API registered');
        return dispose;
    }, 'iepms-attendance-plugin.api');
}
//# sourceMappingURL=index.js.map