import Schema from '@deepseek-ai/schemastery';
import { homedir } from 'node:os';
import { join } from 'node:path';
export const Config = Schema.object({
    dataRoot: Schema.string().default('').description('Plugin-owned data directory. Leave empty to use the local application data directory.'),
    legacyImportRoot: Schema.string().default('').description('Optional old tool data directory to import once. It is not used after migration.'),
    pythonPath: Schema.string().default('python').description('Python executable used by the scoped local bridge.'),
    bridgeTimeoutMs: Schema.number().min(1000).max(30000).default(8000).description('Local bridge timeout in milliseconds.'),
});
export function resolveConfig(value) {
    const prior = value;
    const defaultDataRoot = join(process.env.LOCALAPPDATA || homedir(), 'DeepSeek Harness', 'plugins', 'iepms-attendance-plugin');
    return {
        dataRoot: value.dataRoot.trim() || defaultDataRoot,
        legacyImportRoot: value.legacyImportRoot.trim() || (typeof prior.backendRoot === 'string' ? prior.backendRoot.trim() : ''),
        pythonPath: value.pythonPath.trim() || 'python',
        bridgeTimeoutMs: Math.min(30000, Math.max(1000, Math.round(value.bridgeTimeoutMs))),
    };
}
//# sourceMappingURL=config.js.map