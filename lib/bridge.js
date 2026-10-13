import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const MAX_STDOUT_BYTES = 256 * 1024;
const MAX_STDERR_BYTES = 16 * 1024;
export class AttendanceBridge {
    config;
    bridgePath;
    constructor(config) {
        this.config = config;
        const bundledBridge = resolve(dirname(fileURLToPath(import.meta.url)), '../backend/iepms_bridge.py');
        const legacyBridge = resolve(config.backendRoot, 'iepms_bridge.py');
        this.bridgePath = existsSync(bundledBridge) ? bundledBridge : legacyBridge;
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
    async updateConfiguration(settings) {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke('configuration-update', settings);
        if (!response.ok || response.data === undefined) {
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '本地配置保存失败。');
        }
        return response.data;
    }
    async updatePersonalAccount(settings) {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke('personal-account-update', settings);
        if (!response.ok || response.data === undefined) {
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人账号保存失败。');
        }
        return response.data;
    }
    async startPersonalRun() {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke('personal-run-start', {});
        if (!response.ok || response.data === undefined) {
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人巡检启动失败。');
        }
        return response.data;
    }
    async updatePersonalSchedule(settings) {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke('personal-schedule-update', settings);
        if (!response.ok || response.data === undefined) {
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人定时巡检保存失败。');
        }
        return response.data;
    }
    invoke(command, settings) {
        return new Promise((resolveResult, reject) => {
            const child = spawn(this.config.pythonPath, [this.bridgePath], {
                cwd: this.config.backendRoot,
                env: { ...process.env, IEPMS_BACKEND_ROOT: this.config.backendRoot, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
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
                child.kill();
                finish(() => reject(new BridgeError('BRIDGE_TIMEOUT', '读取 iEPMS 状态超时。')));
            }, this.config.bridgeTimeoutMs);
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            child.stdout.on('data', chunk => { if (stdout.length < MAX_STDOUT_BYTES)
                stdout += chunk; });
            child.stderr.on('data', chunk => { if (stderr.length < MAX_STDERR_BYTES)
                stderr += chunk; });
            child.on('error', () => finish(() => reject(new BridgeError('PYTHON_UNAVAILABLE', '无法启动配置的 Python 运行时。'))));
            child.on('close', code => finish(() => {
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
            child.stdin.end(JSON.stringify(settings === undefined ? { version: 1, command } : { version: 1, command, settings }));
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