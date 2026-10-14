import type { AttendanceReminderType, PersonalReminderSettings } from './contracts.js';
import type { PersonalInspectionResult } from './personal-inspection-service.js';
export interface AttendanceReminderEvent {
    version: 1;
    id: string;
    occurredAt: string;
    attendanceDate: string;
    type: AttendanceReminderType;
    priority: 'info' | 'warning' | 'urgent';
    title: string;
    body: string;
    action: 'open-attendance' | 'none';
    expiresAt: string;
}
export declare function reminderEventsForResult(result: PersonalInspectionResult, settings: PersonalReminderSettings, now?: Date): AttendanceReminderEvent[];
export declare function assertAttendanceReminderEvent(input: unknown): AttendanceReminderEvent;
//# sourceMappingURL=reminder-events.d.ts.map