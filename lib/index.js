import { registerAttendanceApi } from './api.js';
import { AttendanceBridge } from './bridge.js';
import { Config as ConfigSchema, resolveConfig } from './config.js';
import { createPersonalInspectionService, PERSONAL_INSPECTION_SERVICE } from './personal-inspection-service.js';
import { installPetAttendanceIntegration } from './pet-integration.js';
export const name = 'iepms-attendance-plugin';
export const inject = ['webServer'];
export const Config = ConfigSchema;
export function apply(ctx, config) {
    const runtime = ctx;
    const resolved = resolveConfig(config);
    const bridge = new AttendanceBridge(resolved);
    const inspection = createPersonalInspectionService(bridge);
    // Keep the startup-only entry private to this plugin. Other plugins, PET
    // included, receive only the explicitly user-initiated public surface.
    runtime.provide?.(PERSONAL_INSPECTION_SERVICE, {
        start: inspection.start,
        status: inspection.status,
    });
    runtime.effect(() => installPetAttendanceIntegration(runtime, inspection), 'iepms-attendance-plugin.pet');
    runtime.effect(() => {
        const dispose = registerAttendanceApi(runtime, bridge);
        runtime.logger.info('iepms-attendance-plugin: local dashboard and secure configuration API registered');
        return dispose;
    }, 'iepms-attendance-plugin.api');
}
//# sourceMappingURL=index.js.map