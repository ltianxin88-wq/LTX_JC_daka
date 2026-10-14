import type { Config } from './config.js';
import type { ConfigurationUpdate, ConfigurationView, ManagementAnalyticsFilter, ManagementAnalyticsPersonView, ManagementAnalyticsView, ManagementRunView, PersonalAccountUpdate, PersonalAttendanceView, PersonalAutomationView, PersonalMakeupSubmit, PersonalMakeupView, PersonalReminderDeliveryComplete, PersonalReminderDeliveryReservation, PersonalReminderDeliveryReserve, PersonalReminderSettingsUpdate, PersonalRosterUpdate, PersonalRosterView, PersonalScheduleUpdate, PersonalStartupClaim, PersonalStartupClaimResult, ReadCommand, RosterTableView, RosterUpdate, RuntimePreparationView } from './contracts.js';
export declare class AttendanceBridge {
    private readonly config;
    readonly bridgePath: string;
    readonly coreRequirementsPath: string;
    readonly automationRequirementsPath: string;
    private coreRuntime;
    private automationRuntime;
    private runtimeStatus;
    constructor(config: Config);
    read<T>(command: ReadCommand): Promise<T>;
    readRuntimeStatus(): RuntimePreparationView;
    updateConfiguration(settings: ConfigurationUpdate): Promise<ConfigurationView>;
    updatePersonalAccount(settings: PersonalAccountUpdate): Promise<PersonalAttendanceView>;
    startPersonalRun(): Promise<PersonalAutomationView>;
    startManagementRun(): Promise<ManagementRunView>;
    readManagementAnalytics(settings: ManagementAnalyticsFilter): Promise<ManagementAnalyticsView>;
    readManagementAnalyticsPerson(settings: ManagementAnalyticsFilter): Promise<ManagementAnalyticsPersonView>;
    updatePersonalSchedule(settings: PersonalScheduleUpdate): Promise<PersonalAutomationView>;
    updatePersonalReminderSettings(settings: PersonalReminderSettingsUpdate): Promise<PersonalAutomationView>;
    reservePersonalReminder(settings: PersonalReminderDeliveryReserve): Promise<PersonalReminderDeliveryReservation>;
    completePersonalReminder(settings: PersonalReminderDeliveryComplete): Promise<void>;
    claimPersonalStartup(settings: PersonalStartupClaim): Promise<PersonalStartupClaimResult>;
    updateRoster(settings: RosterUpdate): Promise<RosterTableView>;
    updatePersonalRoster(settings: PersonalRosterUpdate): Promise<PersonalRosterView>;
    submitPersonalMakeup(settings: PersonalMakeupSubmit): Promise<PersonalMakeupView>;
    private invoke;
    private prepareRuntime;
    private runtimeError;
}
export declare class BridgeError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
//# sourceMappingURL=bridge.d.ts.map