import Schema from '@deepseek-ai/schemastery';
export const Config = Schema.object({
    backendRoot: Schema.string().default('D:/dingding/daka').description('iEPMS Python backend root.'),
    pythonPath: Schema.string().default('python').description('Python executable used only for read-only bridge calls.'),
    bridgeTimeoutMs: Schema.number().min(1000).max(30000).default(8000).description('Read-only bridge timeout in milliseconds.'),
});
export function resolveConfig(value) {
    return {
        backendRoot: value.backendRoot.trim() || 'D:/dingding/daka',
        pythonPath: value.pythonPath.trim() || 'python',
        bridgeTimeoutMs: Math.min(30000, Math.max(1000, Math.round(value.bridgeTimeoutMs))),
    };
}
//# sourceMappingURL=config.js.map