import type { Config } from './config.js';
import type { ConfigurationUpdate, ConfigurationView, PersonalAccountUpdate, PersonalAttendanceView, PersonalAutomationView, PersonalRosterUpdate, PersonalRosterView, PersonalScheduleUpdate, ReadCommand, RosterTableView, RosterUpdate } from './contracts.js';
export declare class AttendanceBridge {
    private readonly config;
    readonly bridgePath: string;
    constructor(config: Config);
    read<T>(command: ReadCommand): Promise<T>;
    updateConfiguration(settings: ConfigurationUpdate): Promise<ConfigurationView>;
    updatePersonalAccount(settings: PersonalAccountUpdate): Promise<PersonalAttendanceView>;
    startPersonalRun(): Promise<PersonalAutomationView>;
    updatePersonalSchedule(settings: PersonalScheduleUpdate): Promise<PersonalAutomationView>;
    updateRoster(settings: RosterUpdate): Promise<RosterTableView>;
    updatePersonalRoster(settings: PersonalRosterUpdate): Promise<PersonalRosterView>;
    private invoke;
}
export declare class BridgeError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
//# sourceMappingURL=bridge.d.ts.map