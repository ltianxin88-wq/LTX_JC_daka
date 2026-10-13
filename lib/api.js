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
    const url = new URL(req.url ?? '/', 'http://iepms.local');
    const path = url.pathname.slice(API_PREFIX.length).replace(/^\/+|\/+$/gu, '');
    const method = req.method ?? 'GET';
    if (path === 'configuration' && method === 'GET') {
        return sendJson(res, 200, await bridge.read('configuration-read'));
    }
    if (path === 'personal-attendance' && method === 'GET') {
        return sendJson(res, 200, await bridge.read('personal-attendance'));
    }
    if (path === 'personal-automation' && method === 'GET') {
        return sendJson(res, 200, await bridge.read('personal-automation-read'));
    }
    if (path === 'configuration' && method === 'PUT') {
        const settings = validateConfigurationUpdate(await readJsonBody(req));
        return sendJson(res, 200, await bridge.updateConfiguration(settings));
    }
    if (path === 'personal-account' && method === 'PUT') {
        const settings = validatePersonalAccountUpdate(await readJsonBody(req));
        return sendJson(res, 200, await bridge.updatePersonalAccount(settings));
    }
    if (path === 'personal-run' && method === 'POST') {
        return sendJson(res, 202, await bridge.startPersonalRun());
    }
    if (path === 'personal-schedule' && method === 'PUT') {
        const settings = validatePersonalScheduleUpdate(await readJsonBody(req));
        return sendJson(res, 200, await bridge.updatePersonalSchedule(settings));
    }
    if (method !== 'GET')
        throw httpError(405, '该考勤接口不支持此请求方式。');
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
async function readJsonBody(req) {
    const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
    if (!contentType.startsWith('application/json'))
        throw httpError(415, '配置请求必须使用 JSON。');
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 16 * 1024)
            throw httpError(413, '配置请求过大。');
        chunks.push(buffer);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        throw httpError(400, '配置请求不是有效的 JSON。');
    }
}
function validateConfigurationUpdate(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        throw httpError(400, '配置内容无效。');
    const record = value;
    const allowed = new Set(['username', 'password', 'defaultWebhook', 'browserChannel', 'overnightExemptAttendance', 'overnightCheckWorkHours']);
    if (Object.keys(record).some(key => !allowed.has(key)))
        throw httpError(400, '配置中包含不受支持的字段。');
    for (const key of ['username', 'password', 'defaultWebhook']) {
        if (record[key] !== undefined && typeof record[key] !== 'string')
            throw httpError(400, `${key} 必须是字符串。`);
    }
    if (record.browserChannel !== undefined && !['chrome', 'chromium', 'msedge'].includes(String(record.browserChannel)))
        throw httpError(400, '浏览器通道无效。');
    for (const key of ['overnightExemptAttendance', 'overnightCheckWorkHours']) {
        if (record[key] !== undefined && typeof record[key] !== 'boolean')
            throw httpError(400, `${key} 必须是布尔值。`);
    }
    return record;
}
function validatePersonalAccountUpdate(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        throw httpError(400, '个人账号配置无效。');
    const record = value;
    if (Object.keys(record).length !== 1 || typeof record.account !== 'string')
        throw httpError(400, '个人版只接受一个账号字段。');
    const account = record.account.trim();
    if (!account)
        throw httpError(400, '请填写个人考勤账号。');
    if (account.length > 100 || !/^[A-Za-z0-9_.@-]+$/u.test(account))
        throw httpError(400, '个人账号只能包含字母、数字及 . _ @ -。');
    return { account };
}
function validatePersonalScheduleUpdate(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        throw httpError(400, '个人定时配置无效。');
    const record = value;
    if (Object.keys(record).length !== 2 || typeof record.enabled !== 'boolean' || !Array.isArray(record.times))
        throw httpError(400, '个人定时配置格式无效。');
    if (record.times.length > 4 || record.times.some(value => typeof value !== 'string'))
        throw httpError(400, '个人巡检时间最多配置 4 个。');
    const times = [...new Set(record.times.map(value => String(value).trim()))];
    if (times.some(value => !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value)))
        throw httpError(400, '巡检时间必须使用 HH:MM 格式。');
    if (record.enabled && times.length === 0)
        throw httpError(400, '启用定时巡检时至少需要一个时间。');
    return { enabled: record.enabled, times };
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
    const status = known?.code === 'INVALID_CONFIGURATION' ? 400
        : error instanceof Error && 'status' in error && typeof error.status === 'number'
            ? error.status : 503;
    sendJson(res, status, { error: known?.message ?? (status >= 500 ? '考勤状态服务暂不可用。' : error instanceof Error ? error.message : '请求失败。'), code: known?.code ?? 'UNAVAILABLE' });
}
function httpError(status, message) { return Object.assign(new Error(message), { status }); }
//# sourceMappingURL=api.js.map