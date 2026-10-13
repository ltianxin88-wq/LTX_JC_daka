import type { Config } from './config.js';
import type { ConfigurationUpdate, ConfigurationView, ManagementAnalyticsFilter, ManagementAnalyticsPersonView, ManagementAnalyticsView, ManagementRunView, PersonalAccountUpdate, PersonalAttendanceView, PersonalAutomationView, PersonalMakeupSubmit, PersonalMakeupView, PersonalRosterUpdate, PersonalRosterView, PersonalScheduleUpdate, ReadCommand, RosterTableView, RosterUpdate } from './contracts.js';
export declare class AttendanceBridge {
    private readonly config;
    readonly bridgePath: string;
    readonly requirementsPath: string;
    private runtime;
    constructor(config: Config);
    read<T>(command: ReadCommand): Promise<T>;
    updateConfiguration(settings: ConfigurationUpdate): Promise<ConfigurationView>;
    updatePersonalAccount(settings: PersonalAccountUpdate): Promise<PersonalAttendanceView>;
    startPersonalRun(): Promise<PersonalAutomationView>;
    startManagementRun(): Promise<ManagementRunView>;
    readManagementAnalytics(settings: ManagementAnalyticsFilter): Promise<ManagementAnalyticsView>;
    readManagementAnalyticsPerson(settings: ManagementAnalyticsFilter): Promise<ManagementAnalyticsPersonView>;
    updatePersonalSchedule(settings: PersonalScheduleUpdate): Promise<PersonalAutomationView>;
    updateRoster(settings: RosterUpdate): Promise<RosterTableView>;
    updatePersonalRoster(settings: PersonalRosterUpdate): Promise<PersonalRosterView>;
    submitPersonalMakeup(settings: PersonalMakeupSubmit): Promise<PersonalMakeupView>;
    private invoke;
    private prepareRuntime;
}
export declare class BridgeError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
//# sourceMappingURL=bridge.d.ts.map