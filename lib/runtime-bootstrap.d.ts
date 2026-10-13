export declare class RuntimeBootstrapError extends Error {
}
export interface RuntimeBootstrapOptions {
    pythonPath: string;
    dataRoot: string;
    requirementsPath: string;
    packageIndexUrl: string;
}
export interface RuntimeBootstrapResult {
    pythonPath: string;
    environment: NodeJS.ProcessEnv;
}
export declare function prepareRuntime(options: RuntimeBootstrapOptions): Promise<RuntimeBootstrapResult>;
//# sourceMappingURL=runtime-bootstrap.d.ts.map