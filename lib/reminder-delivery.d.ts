import type { AttendanceBridge } from './bridge.js';
import type { AttendanceReminderChannel, PersonalReminderSettings } from './contracts.js';
import type { AttendanceReminderEvent } from './reminder-events.js';
import type { RuntimeContextLike } from './runtime.js';
export interface PetReminderIntegration {
    announceAttendanceReminder?(event: AttendanceReminderEvent): {
        ok: boolean;
    };
}
export declare function deliverReminder(runtime: RuntimeContextLike, bridge: AttendanceBridge, pet: PetReminderIntegration | undefined, event: AttendanceReminderEvent, settings: PersonalReminderSettings): Promise<AttendanceReminderChannel | undefined>;
//# sourceMappingURL=reminder-delivery.d.ts.map