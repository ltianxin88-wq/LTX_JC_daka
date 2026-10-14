import type { AttendanceBridge } from './bridge.js';
import type { PersonalAutomationView } from './contracts.js';
export declare const PERSONAL_INSPECTION_SERVICE = "iepmsAttendancePersonalInspection";
export type PersonalInspectionState = 'accepted' | 'running' | 'success' | 'error';
export type PersonalInspectionAttendance = 'normal' | 'late' | 'early' | 'missing' | 'checked-in' | 'pending' | 'not-scheduled' | 'unknown';
export interface PersonalInspectionStartRequest {
    userInitiated: true;
    requestId: string;
}
export interface PersonalInspectionResult {
    operationId: string;
    state: PersonalInspectionState;
    message: string;
    attendance?: {
        date: string;
        status: PersonalInspectionAttendance;
    };
}
export interface PersonalInspectionService {
    start(request: PersonalInspectionStartRequest): Promise<PersonalInspectionResult>;
    status(operationId: string): Promise<PersonalInspectionResult>;
}
/** Internal entry used by the attendance plugin's startup lifecycle only. */
export interface PersonalInspectionInternalService extends PersonalInspectionService {
    startAutomatic(): Promise<PersonalInspectionResult | undefined>;
}
interface InspectionBridge {
    startPersonalRun(): Promise<PersonalAutomationView>;
    read<T>(command: 'personal-automation-read' | 'personal-attendance'): Promise<T>;
    claimPersonalStartup(settings: {
        attendanceDate: string;
    }): Promise<{
        claimed: boolean;
    }>;
}
export declare function createPersonalInspectionService(bridge: InspectionBridge | AttendanceBridge): PersonalInspectionInternalService;
export {};
//# sourceMappingURL=personal-inspection-service.d.ts.map