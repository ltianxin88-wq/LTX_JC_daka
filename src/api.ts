import type { IncomingMessage, ServerResponse } from 'node:http'
import { AttendanceBridge, BridgeError } from './bridge.js'
import {
  API_PREFIX, CLIENT_HEADER, CLIENT_NAME,
  type ConfigurationUpdate, type ConfigurationView, type DashboardSnapshot, type ReadCommand, type RecentRunView, type RosterView, type ScheduleView, type StatusView,
} from './contracts.js'
import type { RuntimeContextLike } from './runtime.js'

export function registerAttendanceApi(ctx: RuntimeContextLike, bridge: AttendanceBridge): () => void {
  const server = ctx.webServer ?? ctx.get('webServer') as RuntimeContextLike['webServer']
  if (server === undefined) throw new Error('iEPMS attendance plugin requires the DSH webServer service')
  return server.register({
    kind: 'prefix', path: API_PREFIX,
    handler: async (req, res) => {
      try { await dispatch(req, res, bridge) } catch (error) { sendError(res, error) }
    },
  })
}

async function dispatch(req: IncomingMessage, res: ServerResponse, bridge: AttendanceBridge): Promise<void> {
  assertBrowserRequest(req)
  const url = new URL(req.url ?? '/', 'http://iepms.local')
  const path = url.pathname.slice(API_PREFIX.length).replace(/^\/+|\/+$/gu, '')
  const method = req.method ?? 'GET'
  if (path === 'configuration' && method === 'GET') {
    return sendJson(res, 200, await bridge.read<ConfigurationView>('configuration-read'))
  }
  if (path === 'configuration' && method === 'PUT') {
    const settings = validateConfigurationUpdate(await readJsonBody(req))
    return sendJson(res, 200, await bridge.updateConfiguration(settings))
  }
  if (method !== 'GET') throw httpError(405, '该考勤接口不支持此请求方式。')
  if (path === 'health') return sendJson(res, 200, { ok: true, mode: 'read-only', service: 'iepms-attendance-plugin' })
  if (path === 'snapshot') {
    const [status, roster, schedule, recentRuns] = await Promise.all([
      bridge.read<StatusView>('status'), bridge.read<RosterView>('roster-summary'),
      bridge.read<ScheduleView>('schedule-status'), bridge.read<RecentRunView[]>('recent-runs'),
    ])
    return sendJson(res, 200, { status, roster, schedule, recentRuns } satisfies DashboardSnapshot)
  }
  if (path === 'status' || path === 'roster-summary' || path === 'schedule-status' || path === 'recent-runs') {
    return sendJson(res, 200, await bridge.read(path as ReadCommand))
  }
  throw httpError(404, '考勤状态接口不存在。')
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
  if (!contentType.startsWith('application/json')) throw httpError(415, '配置请求必须使用 JSON。')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 16 * 1024) throw httpError(413, '配置请求过大。')
    chunks.push(buffer)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw httpError(400, '配置请求不是有效的 JSON。') }
}

function validateConfigurationUpdate(value: unknown): ConfigurationUpdate {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, '配置内容无效。')
  const record = value as Record<string, unknown>
  const allowed = new Set(['username', 'password', 'defaultWebhook', 'browserChannel', 'overnightExemptAttendance', 'overnightCheckWorkHours'])
  if (Object.keys(record).some(key => !allowed.has(key))) throw httpError(400, '配置中包含不受支持的字段。')
  for (const key of ['username', 'password', 'defaultWebhook'] as const) {
    if (record[key] !== undefined && typeof record[key] !== 'string') throw httpError(400, `${key} 必须是字符串。`)
  }
  if (record.browserChannel !== undefined && !['chrome', 'chromium', 'msedge'].includes(String(record.browserChannel))) throw httpError(400, '浏览器通道无效。')
  for (const key of ['overnightExemptAttendance', 'overnightCheckWorkHours'] as const) {
    if (record[key] !== undefined && typeof record[key] !== 'boolean') throw httpError(400, `${key} 必须是布尔值。`)
  }
  return record as ConfigurationUpdate
}

function assertBrowserRequest(req: IncomingMessage): void {
  if (req.headers[CLIENT_HEADER] !== CLIENT_NAME) throw httpError(401, '考勤插件客户端标识无效。')
  const site = req.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin' && site !== 'none') throw httpError(403, '已拒绝跨站考勤状态请求。')
  const origin = req.headers.origin
  if (origin === undefined) return
  const expected = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host
  let received: string
  try { received = new URL(origin).host } catch { throw httpError(403, '考勤插件来源无效。') }
  if (expected === undefined || received.toLowerCase() !== expected.toLowerCase()) throw httpError(403, '已拒绝跨源考勤状态请求。')
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(payload)
}

function sendError(res: ServerResponse, error: unknown): void {
  const known = error instanceof BridgeError ? error : undefined
  const status = known?.code === 'INVALID_CONFIGURATION' ? 400
    : error instanceof Error && 'status' in error && typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status : 503
  sendJson(res, status, { error: known?.message ?? (status >= 500 ? '考勤状态服务暂不可用。' : error instanceof Error ? error.message : '请求失败。'), code: known?.code ?? 'UNAVAILABLE' })
}

function httpError(status: number, message: string): Error { return Object.assign(new Error(message), { status }) }
