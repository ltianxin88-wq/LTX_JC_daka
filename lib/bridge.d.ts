import type { Config } from './config.js';
import type { ConfigurationUpdate, ConfigurationView, ReadCommand } from './contracts.js';
export declare class AttendanceBridge {
    private readonly config;
    readonly bridgePath: string;
    constructor(config: Config);
    read<T>(command: ReadCommand): Promise<T>;
    updateConfiguration(settings: ConfigurationUpdate): Promise<ConfigurationView>;
    private invoke;
}
export declare class BridgeError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
//# sourceMappingURL=bridge.d.ts.map