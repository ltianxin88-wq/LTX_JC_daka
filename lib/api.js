import { BridgeError } from './bridge.js';
import { API_PREFIX, CLIENT_HEADER, CLIENT_NAME, } from './contracts.js';
export function registerAttendanceApi(ctx, bridge) {
    const server = ctx.webServer ?? ctx.get('webServer');
    if (server === undefined)
        throw new Error('iEPMS attendance plugin requires the DSH webServer service');
    return server.register({
        kind: 'prefix', path: API_PREFIX,
        handler: async (req, res) => {
            try {
                await dispatch(req, res, bridge);
            }
            catch (error) {
                sendError(res, error);
            }
        },
    });
}
async function dispatch(req, res, bridge) {
    assertBrowserRequest(req);
    if ((req.method ?? 'GET') !== 'GET')
        throw httpError(405, '此版本仅提供只读考勤状态接口。');
    const url = new URL(req.url ?? '/', 'http://iepms.local');
    const path = url.pathname.slice(API_PREFIX.length).replace(/^\/+|\/+$/gu, '');
    if (path === 'health')
        return sendJson(res, 200, { ok: true, mode: 'read-only', service: 'iepms-attendance-plugin' });
    if (path === 'snapshot') {
        const [status, roster, schedule, recentRuns] = await Promise.all([
            bridge.read('status'), bridge.read('roster-summary'),
            bridge.read('schedule-status'), bridge.read('recent-runs'),
        ]);
        return sendJson(res, 200, { status, roster, schedule, recentRuns });
    }
    if (path === 'status' || path === 'roster-summary' || path === 'schedule-status' || path === 'recent-runs') {
        return sendJson(res, 200, await bridge.read(path));
    }
    throw httpError(404, '考勤状态接口不存在。');
}
function assertBrowserRequest(req) {
    if (req.headers[CLIENT_HEADER] !== CLIENT_NAME)
        throw httpError(401, '考勤插件客户端标识无效。');
    const site = req.headers['sec-fetch-site'];
    if (site !== undefined && site !== 'same-origin' && site !== 'none')
        throw httpError(403, '已拒绝跨站考勤状态请求。');
    const origin = req.headers.origin;
    if (origin === undefined)
        return;
    const expected = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
    let received;
    try {
        received = new URL(origin).host;
    }
    catch {
        throw httpError(403, '考勤插件来源无效。');
    }
    if (expected === undefined || received.toLowerCase() !== expected.toLowerCase())
        throw httpError(403, '已拒绝跨源考勤状态请求。');
}
function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(payload);
}
function sendError(res, error) {
    const known = error instanceof BridgeError ? error : undefined;
    const status = error instanceof Error && 'status' in error && typeof error.status === 'number'
        ? error.status : 503;
    sendJson(res, status, { error: known?.message ?? (status >= 500 ? '考勤状态服务暂不可用。' : error instanceof Error ? error.message : '请求失败。'), code: known?.code ?? 'UNAVAILABLE' });
}
function httpError(status, message) { return Object.assign(new Error(message), { status }); }
//# sourceMappingURL=api.js.map