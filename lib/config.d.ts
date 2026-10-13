import Schema from '@deepseek-ai/schemastery';
export interface Config {
    backendRoot: string;
    pythonPath: string;
    bridgeTimeoutMs: number;
}
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    backendRoot: Schema<string, string, "defined">;
    pythonPath: Schema<string, string, "defined">;
    bridgeTimeoutMs: Schema<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    backendRoot: Schema<string, string, "defined">;
    pythonPath: Schema<string, string, "defined">;
    bridgeTimeoutMs: Schema<number, number, "defined">;
}>>, "plain">;
export declare function resolveConfig(value: Config): Config;
//# sourceMappingURL=config.d.ts.map