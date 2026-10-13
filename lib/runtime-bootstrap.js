import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const REQUIRED_IMPORTS = 'import playwright, openpyxl, requests, cv2, numpy, chinese_calendar, portalocker, psutil; import win32crypt';
const INSTALL_TIMEOUT_MS = 15 * 60 * 1000;
const OFFICIAL_PYPI_INDEX = 'https://pypi.org/simple';
export class RuntimeBootstrapError extends Error {
}
export async function prepareRuntime(options) {
    try {
        await runPython(options.pythonPath, ['--version'], process.env, 15_000);
    }
    catch {
        throw new RuntimeBootstrapError('未找到 Python 运行时。请安装桌面端配套运行环境后重新打开插件。');
    }
    const runtimeRoot = join(options.dataRoot, 'python-runtime');
    const runtimePython = join(runtimeRoot, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    if (!existsSync(runtimePython)) {
        try {
            await runPython(options.pythonPath, ['-m', 'venv', runtimeRoot], process.env, 60_000);
        }
        catch {
            throw new RuntimeBootstrapError('无法创建插件专用 Python 运行环境。请检查系统 Python 安装。');
        }
    }
    const environment = { ...process.env };
    if (await importsAvailable(runtimePython, environment))
        return { pythonPath: runtimePython, environment };
    const indexes = [...new Set([options.packageIndexUrl, OFFICIAL_PYPI_INDEX])];
    for (const indexUrl of indexes) {
        try {
            await runPython(runtimePython, [
                '-m', 'pip', 'install', '--disable-pip-version-check', '--no-input', '--upgrade',
                '--index-url', indexUrl, '--requirement', options.requirementsPath,
            ], environment, INSTALL_TIMEOUT_MS);
            if (await importsAvailable(runtimePython, environment))
                return { pythonPath: runtimePython, environment };
        }
        catch {
            // Try the official index when the preferred mirror is unavailable.
        }
    }
    throw new RuntimeBootstrapError('首次准备 iEPMS 运行环境失败。请检查网络连接后重试。');
}
async function importsAvailable(pythonPath, environment) {
    try {
        await runPython(pythonPath, ['-c', REQUIRED_IMPORTS], environment, 30_000);
        return true;
    }
    catch {
        return false;
    }
}
function runPython(command, args, environment, timeoutMs) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const child = spawn(command, args, { env: environment, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        const timeout = setTimeout(() => {
            child.kill();
            finish(new Error('timeout'));
        }, timeoutMs);
        let stderr = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => { if (stderr.length < 8 * 1024)
            stderr += chunk; });
        child.on('error', error => { finish(error); });
        child.on('close', code => { finish(code === 0 ? undefined : new Error(stderr || `exit ${code ?? 'unknown'}`)); });
        function finish(error) {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            if (error === undefined)
                resolve();
            else
                reject(error);
        }
    });
}
//# sourceMappingURL=runtime-bootstrap.js.map