import Schema from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface Config {
  dataRoot: string
  legacyImportRoot: string
  pythonPath: string
  pythonPackageIndex: string
  bridgeTimeoutMs: number
}

export const Config = Schema.object({
  dataRoot: Schema.string().default('').description('Plugin-owned data directory. Leave empty to use the local application data directory.'),
  legacyImportRoot: Schema.string().default('').description('Optional old tool data directory to import once. It is not used after migration.'),
  pythonPath: Schema.string().default('python').description('Python executable used by the scoped local bridge.'),
  pythonPackageIndex: Schema.string().default('https://mirrors.aliyun.com/pypi/simple').description('HTTPS Python package mirror used for automatic first-run dependency setup.'),
  bridgeTimeoutMs: Schema.number().min(1000).max(30000).default(8000).description('Local bridge timeout in milliseconds.'),
})

export function resolveConfig(value: Config): Config {
  const prior = value as Config & { backendRoot?: unknown }
  const defaultDataRoot = join(process.env.LOCALAPPDATA || homedir(), 'DeepSeek Harness', 'plugins', 'iepms-attendance-plugin')
  const packageIndex = value.pythonPackageIndex.trim()
  let pythonPackageIndex = 'https://mirrors.aliyun.com/pypi/simple'
  try {
    const parsed = new URL(packageIndex)
    if (parsed.protocol === 'https:' && parsed.pathname.endsWith('/simple')) pythonPackageIndex = parsed.toString().replace(/\/$/u, '')
  } catch {}
  return {
    dataRoot: value.dataRoot.trim() || defaultDataRoot,
    legacyImportRoot: value.legacyImportRoot.trim() || (typeof prior.backendRoot === 'string' ? prior.backendRoot.trim() : ''),
    pythonPath: value.pythonPath.trim() || 'python',
    pythonPackageIndex,
    bridgeTimeoutMs: Math.min(30000, Math.max(1000, Math.round(value.bridgeTimeoutMs))),
  }
}
