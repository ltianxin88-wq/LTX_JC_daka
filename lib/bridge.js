import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const MAX_STDOUT_BYTES = 256 * 1024;
const MAX_STDERR_BYTES = 16 * 1024;
export class AttendanceBridge {
    config;
    bridgePath;
    constructor(config) {
        this.config = config;
        this.bridgePath = resolve(config.backendRoot, 'iepms_bridge.py');
    }
    async read(command) {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke(command);
        if (!response.ok || response.data === undefined) {
            const message = response.error?.message ?? 'iEPMS 本地桥接程序未返回可用数据。';
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', message);
        }
        return response.data;
    }
    invoke(command) {
        return new Promise((resolveResult, reject) => {
            const process = spawn(this.config.pythonPath, [this.bridgePath], {
                cwd: this.config.backendRoot,
                windowsHide: true,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            let settled = false;
            const finish = (callback) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                callback();
            };
            const timer = setTimeout(() => {
                process.kill();
                finish(() => reject(new BridgeError('BRIDGE_TIMEOUT', '读取 iEPMS 状态超时。')));
            }, this.config.bridgeTimeoutMs);
            process.stdout.setEncoding('utf8');
            process.stderr.setEncoding('utf8');
            process.stdout.on('data', chunk => { if (stdout.length < MAX_STDOUT_BYTES)
                stdout += chunk; });
            process.stderr.on('data', chunk => { if (stderr.length < MAX_STDERR_BYTES)
                stderr += chunk; });
            process.on('error', () => finish(() => reject(new BridgeError('PYTHON_UNAVAILABLE', '无法启动配置的 Python 运行时。'))));
            process.on('close', code => finish(() => {
                if (code !== 0)
                    return reject(new BridgeError('BRIDGE_PROCESS_FAILED', 'iEPMS 本地桥接程序执行失败。'));
                try {
                    const parsed = JSON.parse(stdout);
                    if (parsed.schemaVersion !== 1 || parsed.command !== command || typeof parsed.ok !== 'boolean')
                        throw new Error();
                    resolveResult(parsed);
                }
                catch {
                    reject(new BridgeError('BRIDGE_PROTOCOL_INVALID', 'iEPMS 本地桥接程序返回了无效数据。'));
                }
            }));
            process.stdin.end(JSON.stringify({ version: 1, command }));
        });
    }
}
export class BridgeError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
//# sourceMappingURL=bridge.js.map