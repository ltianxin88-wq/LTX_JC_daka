import type { Context } from '@deepseek-ai/cordis';
import { type Config as AttendanceConfig } from './config.js';
export declare const name = "iepms-attendance-plugin";
export declare const inject: string[];
export declare const Config: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
    backendRoot: import("@deepseek-ai/schemastery").default<string, string, "defined">;
    pythonPath: import("@deepseek-ai/schemastery").default<string, string, "defined">;
    bridgeTimeoutMs: import("@deepseek-ai/schemastery").default<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    backendRoot: import("@deepseek-ai/schemastery").default<string, string, "defined">;
    pythonPath: import("@deepseek-ai/schemastery").default<string, string, "defined">;
    bridgeTimeoutMs: import("@deepseek-ai/schemastery").default<number, number, "defined">;
}>>, "plain">;
export type Config = AttendanceConfig;
export declare function apply(ctx: Context, config: AttendanceConfig): void;
//# sourceMappingURL=index.d.ts.map