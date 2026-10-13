import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Config } from './config.js'
import type { BridgeResponse, ReadCommand } from './contracts.js'

const MAX_STDOUT_BYTES = 256 * 1024
const MAX_STDERR_BYTES = 16 * 1024

export class AttendanceBridge {
  readonly bridgePath: string

  constructor(private readonly config: Config) {
    this.bridgePath = resolve(config.backendRoot, 'iepms_bridge.py')
  }

  async read<T>(command: ReadCommand): Promise<T> {
    if (!existsSync(this.bridgePath)) throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。')
    const response = await this.invoke(command)
    if (!response.ok || response.data === undefined) {
      const message = response.error?.message ?? 'iEPMS 本地桥接程序未返回可用数据。'
      throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', message)
    }
    return response.data as T
  }

  private invoke(command: ReadCommand): Promise<BridgeResponse<unknown>> {
    return new Promise((resolveResult, reject) => {
      const process = spawn(this.config.pythonPath, [this.bridgePath], {
        cwd: this.config.backendRoot,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      let settled = false
      const finish = (callback: () => void): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        callback()
      }
      const timer = setTimeout(() => {
        process.kill()
        finish(() => reject(new BridgeError('BRIDGE_TIMEOUT', '读取 iEPMS 状态超时。')))
      }, this.config.bridgeTimeoutMs)
      process.stdout.setEncoding('utf8')
      process.stderr.setEncoding('utf8')
      process.stdout.on('data', chunk => { if (stdout.length < MAX_STDOUT_BYTES) stdout += chunk })
      process.stderr.on('data', chunk => { if (stderr.length < MAX_STDERR_BYTES) stderr += chunk })
      process.on('error', () => finish(() => reject(new BridgeError('PYTHON_UNAVAILABLE', '无法启动配置的 Python 运行时。'))))
      process.on('close', code => finish(() => {
        if (code !== 0) return reject(new BridgeError('BRIDGE_PROCESS_FAILED', 'iEPMS 本地桥接程序执行失败。'))
        try {
          const parsed = JSON.parse(stdout) as BridgeResponse<unknown>
          if (parsed.schemaVersion !== 1 || parsed.command !== command || typeof parsed.ok !== 'boolean') throw new Error()
          resolveResult(parsed)
        } catch {
          reject(new BridgeError('BRIDGE_PROTOCOL_INVALID', 'iEPMS 本地桥接程序返回了无效数据。'))
        }
      }))
      process.stdin.end(JSON.stringify({ version: 1, command }))
    })
  }
}

export class BridgeError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}
