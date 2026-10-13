import Schema from '@deepseek-ai/schemastery';
export interface Config {
    dataRoot: string;
    legacyImportRoot: string;
    pythonPath: string;
    pythonPackageIndex: string;
    bridgeTimeoutMs: number;
}
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    dataRoot: Schema<string, string, "defined">;
    legacyImportRoot: Schema<string, string, "defined">;
    pythonPath: Schema<string, string, "defined">;
    pythonPackageIndex: Schema<string, string, "defined">;
    bridgeTimeoutMs: Schema<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    dataRoot: Schema<string, string, "defined">;
    legacyImportRoot: Schema<string, string, "defined">;
    pythonPath: Schema<string, string, "defined">;
    pythonPackageIndex: Schema<string, string, "defined">;
    bridgeTimeoutMs: Schema<number, number, "defined">;
}>>, "plain">;
export declare function resolveConfig(value: Config): Config;
//# sourceMappingURL=config.d.ts.map