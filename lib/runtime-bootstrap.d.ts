import type { RuntimePreparationView } from './contracts.js';
export declare class RuntimeBootstrapError extends Error {
}
export interface RuntimeBootstrapOptions {
    pythonPath: string;
    dataRoot: string;
    requirementsPath: string;
    packageIndexUrl: string;
    onProgress?: (status: RuntimePreparationView) => void;
}
export interface RuntimeBootstrapResult {
    pythonPath: string;
    environment: NodeJS.ProcessEnv;
}
export declare function prepareRuntime(options: RuntimeBootstrapOptions): Promise<RuntimeBootstrapResult>;
//# sourceMappingURL=runtime-bootstrap.d.ts.map