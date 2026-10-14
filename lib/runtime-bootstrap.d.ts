import type { RuntimePreparationView } from './contracts.js';
export type RuntimeDependencyTier = 'core' | 'automation';
export declare class RuntimeBootstrapError extends Error {
}
export interface RuntimeBootstrapOptions {
    pythonPath: string;
    dataRoot: string;
    requirementsPath: string;
    dependencyTier: RuntimeDependencyTier;
    packageIndexUrl: string;
    onProgress?: (status: RuntimePreparationView) => void;
}
export interface RuntimeBootstrapResult {
    pythonPath: string;
    environment: NodeJS.ProcessEnv;
}
export declare function prepareRuntime(options: RuntimeBootstrapOptions): Promise<RuntimeBootstrapResult>;
//# sourceMappingURL=runtime-bootstrap.d.ts.map