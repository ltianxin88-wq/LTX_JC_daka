import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RuntimePreparationView } from './contracts.js'

const REQUIRED_IMPORTS = 'import playwright, openpyxl, requests, cv2, numpy, chinese_calendar, portalocker, psutil; import win32crypt'
const INSTALL_TIMEOUT_MS = 15 * 60 * 1000
const OFFICIAL_PYPI_INDEX = 'https://pypi.org/simple'

export class RuntimeBootstrapError extends Error {}

export interface RuntimeBootstrapOptions {
  pythonPath: string
  dataRoot: string
  requirementsPath: string
  packageIndexUrl: string
  onProgress?: (status: RuntimePreparationView) => void
}

export interface RuntimeBootstrapResult {
  pythonPath: string
  environment: NodeJS.ProcessEnv
}

export async function prepareRuntime(options: RuntimeBootstrapOptions): Promise<RuntimeBootstrapResult> {
  const report = (phase: RuntimePreparationView['phase'], progress: number, detail: string): void => {
    options.onProgress?.({ phase, progress, detail, updatedAt: new Date().toISOString() })
  }
  report('checking-python', 8, '正在检查本机 Python 运行时')
  try {
    await runPython(options.pythonPath, ['--version'], process.env, 15_000)
  } catch {
    throw new RuntimeBootstrapError('未找到 Python 运行时。请安装桌面端配套运行环境后重新打开插件。')
  }
  const runtimeRoot = join(options.dataRoot, 'python-runtime')
  const runtimePython = join(runtimeRoot, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
  if (!existsSync(runtimePython)) {
    report('creating-environment', 20, '正在创建插件专用运行环境')
    try {
      await runPython(options.pythonPath, ['-m', 'venv', runtimeRoot], process.env, 60_000)
    } catch {
      throw new RuntimeBootstrapError('无法创建插件专用 Python 运行环境。请检查系统 Python 安装。')
    }
  }
  const environment = { ...process.env }
  report('checking-dependencies', 35, '正在检查已安装的运行依赖')
  if (await importsAvailable(runtimePython, environment)) {
    report('ready', 100, '运行环境已就绪')
    return { pythonPath: runtimePython, environment }
  }

  const indexes = [...new Set([options.packageIndexUrl, OFFICIAL_PYPI_INDEX])]
  for (const [index, indexUrl] of indexes.entries()) {
    try {
      const source = index === 0 ? '国内镜像源' : '官方镜像源'
      let progress = index === 0 ? 45 : 52
      report('installing-dependencies', progress, `正在从${source}下载运行依赖`)
      await runPython(runtimePython, [
        '-m', 'pip', 'install', '--disable-pip-version-check', '--no-input', '--upgrade', '--prefer-binary', '--only-binary=:all:', '--retries', '1', '--timeout', '20',
        '--index-url', indexUrl, '--requirement', options.requirementsPath,
      ], environment, INSTALL_TIMEOUT_MS, line => {
        const match = /^Collecting\s+([^\s(]+)/iu.exec(line.trim())
        if (match === null) return
        progress = Math.min(85, progress + 4)
        report('installing-dependencies', progress, `正在下载并安装：${match[1]}`)
      })
      report('verifying', 92, '依赖已安装，正在进行可用性验证')
      if (await importsAvailable(runtimePython, environment)) {
        report('ready', 100, '运行环境已就绪')
        return { pythonPath: runtimePython, environment }
      }
    } catch {
      // Try the official index when the preferred mirror is unavailable.
    }
  }
  throw new RuntimeBootstrapError('首次准备 iEPMS 运行环境失败。请检查网络连接后重试。')
}

async function importsAvailable(pythonPath: string, environment: NodeJS.ProcessEnv): Promise<boolean> {
  try {
    await runPython(pythonPath, ['-c', REQUIRED_IMPORTS], environment, 30_000)
    return true
  } catch {
    return false
  }
}

function runPython(command: string, args: string[], environment: NodeJS.ProcessEnv, timeoutMs: number, onOutput?: (line: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const child = spawn(command, args, { env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const timeout = setTimeout(() => {
      child.kill()
      finish(new Error('timeout'))
    }, timeoutMs)
    let stderr = ''
    let stdoutRemainder = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      const output = `${stdoutRemainder}${chunk}`
      const lines = output.split(/\r?\n/u)
      stdoutRemainder = lines.pop() ?? ''
      for (const line of lines) onOutput?.(line)
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => { if (stderr.length < 8 * 1024) stderr += chunk })
    child.on('error', error => { finish(error) })
    child.on('close', code => { finish(code === 0 ? undefined : new Error(stderr || `exit ${code ?? 'unknown'}`)) })
    function finish(error?: Error): void {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (error === undefined) resolve()
      else reject(error)
    }
  })
}
