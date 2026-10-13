import Schema from '@deepseek-ai/schemastery'

export interface Config {
  backendRoot: string
  pythonPath: string
  bridgeTimeoutMs: number
}

export const Config = Schema.object({
  backendRoot: Schema.string().default('D:/dingding/daka').description('iEPMS Python backend root.'),
  pythonPath: Schema.string().default('python').description('Python executable used by the scoped local bridge.'),
  bridgeTimeoutMs: Schema.number().min(1000).max(30000).default(8000).description('Local bridge timeout in milliseconds.'),
})

export function resolveConfig(value: Config): Config {
  return {
    backendRoot: value.backendRoot.trim() || 'D:/dingding/daka',
    pythonPath: value.pythonPath.trim() || 'python',
    bridgeTimeoutMs: Math.min(30000, Math.max(1000, Math.round(value.bridgeTimeoutMs))),
  }
}
