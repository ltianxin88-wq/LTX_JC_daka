import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareRuntime, RuntimeBootstrapError } from './runtime-bootstrap.js';
const MAX_STDOUT_BYTES = 2 * 1024 * 1024;
const MAX_STDERR_BYTES = 16 * 1024;
export class AttendanceBridge {
    config;
    bridgePath;
    requirementsPath;
    runtime;
    runtimeStatus = { phase: 'idle', progress: 0, detail: '等待准备运行环境', updatedAt: new Date().toISOString() };
    constructor(config) {
        this.config = config;
        const bundledRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../backend');
        this.bridgePath = resolve(bundledRoot, 'iepms_bridge.py');
        this.requirementsPath = resolve(bundledRoot, 'requirements.txt');
        mkdirSync(config.dataRoot, { recursive: true });
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
    readRuntimeStatus() {
        return this.runtimeStatus;
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
    async startManagementRun() {
        const response = await this.invoke('management-run-start', {});
        if (!response.ok || response.data === undefined)
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '管理巡检启动失败。');
        return response.data;
    }
    async readManagementAnalytics(settings) {
        const response = await this.invoke('management-analytics-read', settings);
        if (!response.ok || response.data === undefined)
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '考勤运营分析读取失败。');
        return response.data;
    }
    async readManagementAnalyticsPerson(settings) {
        const response = await this.invoke('management-analytics-person-read', settings);
        if (!response.ok || response.data === undefined)
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '人员考勤详情读取失败。');
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
    async updateRoster(settings) {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke('roster-update', settings);
        if (!response.ok || response.data === undefined)
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '花名册保存失败。');
        return response.data;
    }
    async updatePersonalRoster(settings) {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke('personal-roster-update', settings);
        if (!response.ok || response.data === undefined)
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '个人资料保存失败。');
        return response.data;
    }
    async submitPersonalMakeup(settings) {
        if (!existsSync(this.bridgePath))
            throw new BridgeError('BACKEND_UNAVAILABLE', '未找到 iEPMS 本地桥接程序。');
        const response = await this.invoke('personal-makeup-submit', settings);
        if (!response.ok || response.data === undefined)
            throw new BridgeError(response.error?.code ?? 'BRIDGE_FAILED', response.error?.message ?? '补卡申请保存失败。');
        return response.data;
    }
    async invoke(command, settings) {
        const runtime = await this.prepareRuntime();
        return new Promise((resolveResult, reject) => {
            const child = spawn(runtime.pythonPath, [this.bridgePath], {
                cwd: this.config.dataRoot,
                env: { ...runtime.environment, IEPMS_PLUGIN_DATA_ROOT: this.config.dataRoot, IEPMS_LEGACY_IMPORT_ROOT: this.config.legacyImportRoot, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
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
                try {
                    const parsed = JSON.parse(stdout);
                    if (parsed.schemaVersion !== 1 || parsed.command !== command || typeof parsed.ok !== 'boolean')
                        throw new Error();
                    resolveResult(parsed);
                }
                catch {
                    const message = code === 0
                        ? 'iEPMS 本地桥接程序返回了无效数据。'
                        : 'iEPMS 本地桥接程序执行失败。';
                    reject(new BridgeError(code === 0 ? 'BRIDGE_PROTOCOL_INVALID' : 'BRIDGE_PROCESS_FAILED', message));
                }
            }));
            child.stdin.end(JSON.stringify(settings === undefined ? { version: 1, command } : { version: 1, command, settings }));
        });
    }
    prepareRuntime() {
        if (this.runtime === undefined) {
            this.runtime = prepareRuntime({
                pythonPath: this.config.pythonPath,
                dataRoot: this.config.dataRoot,
                requirementsPath: this.requirementsPath,
                packageIndexUrl: this.config.pythonPackageIndex,
                onProgress: status => { this.runtimeStatus = status; },
            }).catch(error => {
                this.runtime = undefined;
                this.runtimeStatus = { phase: 'error', progress: this.runtimeStatus.progress, detail: '运行环境准备失败', updatedAt: new Date().toISOString() };
                if (error instanceof RuntimeBootstrapError)
                    throw new BridgeError('RUNTIME_PREPARATION_FAILED', error.message);
                throw new BridgeError('RUNTIME_PREPARATION_FAILED', 'iEPMS 运行环境准备失败。');
            });
        }
        return this.runtime;
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