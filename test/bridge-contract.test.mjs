import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const bridge = fileURLToPath(new URL('../backend/iepms_bridge.py', import.meta.url))
const runtime = fileURLToPath(new URL('../backend/runtime', import.meta.url))
const backendRoot = 'D:/dingding/daka'

async function invoke(request, root = backendRoot, environment = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn('python', [bridge], { env: { ...processEnv(), IEPMS_PLUGIN_DATA_ROOT: root, PYTHONPATH: root, IEPMS_PLUGIN_TEST_RUNTIME: '1', PYTHONUTF8: '1', ...environment }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    process.stdout.setEncoding('utf8')
    process.stderr.setEncoding('utf8')
    process.stdout.on('data', chunk => { stdout += chunk })
    process.stderr.on('data', chunk => { stderr += chunk })
    process.on('error', reject)
    process.on('close', code => {
      const value = JSON.parse(stdout)
      if (code === 0) resolve(value)
      else reject(Object.assign(new Error(stderr || value.error?.message || 'bridge failed'), { stdout, value }))
    })
    process.stdin.end(JSON.stringify(request))
  })
}

async function runPython(source, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('python', ['-c', source], { env: { ...processEnv(), PYTHONUTF8: '1' }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr || 'python helper failed')))
    child.stdin.end(input)
  })
}

async function writeRoster(path, rows) {
  await runPython([
    'import json, sys, openpyxl',
    'value = json.load(sys.stdin)',
    'workbook = openpyxl.Workbook()',
    'sheet = workbook.active',
    'sheet.title = value["title"]',
    'sheet.append(value["headers"])',
    '[sheet.append(row) for row in value["rows"]]',
    'workbook.save(value["path"])',
  ].join('; '), JSON.stringify({
    path, rows, title: '花名册',
    headers: ['项目名称', '项目号', '姓名', '地市', '打卡账号', '钉钉Webhook', '手机号', '钉钉号'],
  }))
}

async function readRoster(path) {
  const stdout = await runPython([
    'import json, sys, openpyxl',
    'path = sys.stdin.read()',
    'workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)',
    'print(json.dumps(list(workbook.active.iter_rows(values_only=True)), ensure_ascii=False))',
  ].join('; '), path)
  return JSON.parse(stdout)
}

async function readDatabase(path, sql) {
  const stdout = await runPython([
    'import json, sqlite3, sys',
    'value = json.load(sys.stdin)',
    'connection = sqlite3.connect(value["path"])',
    'connection.row_factory = sqlite3.Row',
    'print(json.dumps([dict(row) for row in connection.execute(value["sql"])], ensure_ascii=False))',
  ].join('; '), JSON.stringify({ path, sql }))
  return JSON.parse(stdout)
}

function processEnv() { return process.env }

test('read-only bridge returns a sanitized status view', async () => {
  const value = await invoke({ version: 1, command: 'status' })
  assert.equal(value.ok, true)
  assert.equal(value.schemaVersion, 1)
  assert.equal(value.command, 'status')
  assert.equal(value.data.application.name, '插件内置后端')
  assert.equal(value.data.safety.mode, 'read-only')
  assert.equal(value.data.safety.automaticActionsEnabled, false)
  assert.equal(typeof value.data.configuration.accountConfigured, 'boolean')
  assert.equal(typeof value.data.configuration.webhookConfigured, 'boolean')
  assert.equal(JSON.stringify(value).includes('default_webhook'), false)
})

test('bridge rejects unsupported commands and unexpected parameters', async () => {
  for (const request of [
    { version: 1, command: 'unsupported-command' },
    { version: 1, command: 'status', path: 'C:/Windows' },
  ]) {
    try {
      await invoke(request)
      assert.fail('bridge invocation must return a non-zero status')
    } catch (error) {
      const stdout = error.stdout ?? ''
      const value = JSON.parse(stdout)
      assert.equal(value.ok, false)
      assert.match(value.error.code, /COMMAND_NOT_ALLOWED|INVALID_REQUEST/)
    }
  }
})

test('bridge preserves empty recent-run collections as arrays', async () => {
  const value = await invoke({ version: 1, command: 'recent-runs' })
  assert.equal(value.ok, true)
  assert.equal(Array.isArray(value.data), true)
})

test('configuration update writes only non-secret settings and returns a sanitized view', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-bridge-'))
  try {
    await writeFile(join(root, 'config.json'), '{}\n', 'utf8')
    await writeFile(join(root, 'keyring_utils.py'), [
      '_passwords = {}',
      'def set_password(username, password): _passwords[username] = password; return True',
      'def get_password(username): return _passwords.get(username)',
      'def mask_account(username): return username[:2] + "***" if username else ""',
    ].join('\n'), 'utf8')
    const value = await invoke({ version: 1, command: 'configuration-update', settings: {
      username: 'test.user', password: 'not-a-real-secret', defaultWebhook: 'https://example.invalid/webhook',
      browserChannel: 'msedge', overnightExemptAttendance: false, overnightCheckWorkHours: true,
    } }, root)
    assert.equal(value.ok, true)
    assert.equal(value.data.accountMasked, 'te***')
    assert.equal(value.data.passwordConfigured, true)
    assert.equal(value.data.webhookConfigured, true)
    const stored = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'))
    assert.equal(stored.username, 'test.user')
    assert.equal(stored.default_webhook, 'https://example.invalid/webhook')
    assert.equal('password' in stored, false)
    assert.equal(JSON.stringify(value).includes('not-a-real-secret'), false)
    assert.equal(JSON.stringify(value).includes('example.invalid'), false)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('a fresh plugin directory initializes the packaged credentials without exposing plaintext', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-default-credentials-'))
  try {
    const value = await invoke({ version: 1, command: 'configuration-read' }, root)
    assert.equal(value.ok, true)
    assert.equal(value.data.accountConfigured, true)
    assert.equal(value.data.passwordConfigured, true)
    assert.match(value.data.accountMasked, /^CL\*{4}00$/)
    const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'))
    assert.equal('password' in config, false)
    const rows = await readDatabase(join(root, 'iepms-attendance-plugin.db'), 'SELECT password FROM plugin_credentials')
    assert.equal(rows.length, 1)
    assert.match(rows[0].password, /^dpapi:v1:/)
    const bundledDefaults = await readFile(new URL('../backend/runtime/default_credentials.py', import.meta.url), 'utf8')
    assert.doesNotMatch(bundledDefaults, /CL50121500|XAjc@#%134/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('personal attendance uses its independent account and returns only a sanitized record', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-personal-'))
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({ username: 'manager.user', personal_account: 'test.user' }), 'utf8')
    await writeFile(join(root, 'keyring_utils.py'), [
      'def get_password(username): return "stored"',
      'def mask_account(username): return "te****er"',
    ].join('\n'), 'utf8')
    await writeFile(join(root, 'last_attendance_data.json'), JSON.stringify({
      date: '2026-10-13',
      morning: [
        { '姓名': 'Target Person', '项目名称': 'Private Project', '打卡账号': 'test.user', '上班状态': '已打卡', '打卡时间': '2026-10-13 08:52:00' },
        { '姓名': 'Other Person', '项目名称': 'Other Project', '打卡账号': 'other.user', '上班状态': '已打卡', '打卡时间': '2026-10-13 07:30:00' },
      ],
      evening: [
        { '姓名': 'Target Person', '项目名称': 'Private Project', '打卡账号': 'test.user', '下班状态': '已打卡', '最早打卡': '08:52:00', '最晚打卡': '18:03:00', '核算工时(h)': '9.2', '工时质检': '正常' },
        { '姓名': 'Other Person', '项目名称': 'Other Project', '打卡账号': 'other.user', '下班状态': '已打卡', '最早打卡': '07:30:00', '最晚打卡': '19:00:00', '核算工时(h)': '11.5', '工时质检': '正常' },
      ],
    }), 'utf8')
    const value = await invoke({ version: 1, command: 'personal-attendance' }, root, { IEPMS_BRIDGE_TEST_NOW: '2026-10-13T12:00:00' })
    assert.equal(value.ok, true)
    assert.equal(value.data.configured, true)
    assert.equal(value.data.accountMasked, 'te****er')
    assert.deepEqual(value.data.records, [{ date: '2026-10-13', clockIn: '08:52', clockOut: '18:03', workMinutes: 552, status: 'normal' }])
    assert.equal(value.data.calendar.workdays.includes('2026-10-13'), true)
    assert.equal(value.data.calendar.workdays.includes('2026-10-01'), false)
    const serialized = JSON.stringify(value)
    for (const secret of ['Target Person', 'Other Person', 'Private Project', 'Other Project', 'test.user', 'other.user']) assert.equal(serialized.includes(secret), false)
    const history = await readDatabase(join(root, 'iepms-attendance-plugin.db'), 'SELECT account_hash, attendance_date FROM personal_history')
    assert.equal(history.length, 1)
    assert.equal(JSON.stringify(history).includes('test.user'), false)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('late-night completion is normal from 23:30 through 23:59, but not before', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-late-night-'))
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({ personal_account: 'employee.001' }), 'utf8')
    await writeFile(join(root, 'keyring_utils.py'), 'def mask_account(username): return "masked"\n', 'utf8')
    const writeLatest = (clockOut) => writeFile(join(root, 'last_attendance_data.json'), JSON.stringify({
      date: '2026-10-13', morning: [],
      evening: [{ '打卡账号': 'employee.001', '下班状态': '已打卡', '最早打卡': '18:00:00', '最晚打卡': `${clockOut}:00`, '核算工时(h)': '5.5', '工时质检': '工时不足' }],
    }), 'utf8')
    await writeLatest('23:30')
    const normal = await invoke({ version: 1, command: 'personal-attendance' }, root)
    assert.equal(normal.data.records[0].status, 'normal')
    await runPython('import sqlite3, sys; connection = sqlite3.connect(sys.stdin.read()); connection.execute("UPDATE personal_history SET status = \'early\'"); connection.commit()', join(root, 'iepms-attendance-plugin.db'))
    await rm(join(root, 'last_attendance_data.json'))
    const correctedHistory = await invoke({ version: 1, command: 'personal-attendance' }, root)
    assert.equal(correctedHistory.data.records[0].status, 'normal')
    await writeLatest('23:29')
    const early = await invoke({ version: 1, command: 'personal-attendance' }, root)
    assert.equal(early.data.records[0].status, 'early')
    await writeLatest('23:59')
    const finalMinute = await invoke({ version: 1, command: 'personal-attendance' }, root)
    assert.equal(finalMinute.data.records[0].status, 'normal')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('late-night completion rule accepts only a same-day earlier clock-in', async () => {
  const output = await runPython([
    'import json, sys',
    `sys.path.insert(0, ${JSON.stringify(runtime)})`,
    'from datetime import datetime',
    'from attendance_rules import has_late_night_completion, is_late_night_completion',
    'print(json.dumps([',
    '  is_late_night_completion("08:30", "23:30"),',
    '  is_late_night_completion("08:30", "23:29"),',
    '  has_late_night_completion([datetime(2026, 10, 13, 8, 30), datetime(2026, 10, 13, 23, 59)]),',
    '  has_late_night_completion([datetime(2026, 10, 13, 23, 30), datetime(2026, 10, 14, 23, 30)]),',
    ']))',
  ].join('\n'))
  assert.deepEqual(JSON.parse(output), [true, false, true, false])
})

test('personal account update stores only the independent account and returns a sanitized view', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-personal-config-'))
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({ username: 'manager.user' }), 'utf8')
    await writeFile(join(root, 'keyring_utils.py'), [
      'def get_password(username): return "stored"',
      'def mask_account(username): return username[:2] + "***" if username else ""',
    ].join('\n'), 'utf8')
    const value = await invoke({ version: 1, command: 'personal-account-update', settings: { account: 'employee.001' } }, root)
    assert.equal(value.ok, true)
    assert.equal(value.data.configured, true)
    assert.equal(value.data.accountMasked, 'em***')
    assert.equal(JSON.stringify(value).includes('employee.001'), false)
    const stored = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'))
    assert.equal(stored.username, 'manager.user')
    assert.equal('personal_account' in stored, false)
    const settings = await readDatabase(join(root, 'iepms-attendance-plugin.db'), "SELECT key, value FROM plugin_settings WHERE key = 'personal-account'")
    assert.equal(settings.length, 1)
    assert.equal(settings[0].value, 'employee.001')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('personal account update rejects extra fields', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-personal-invalid-'))
  try {
    await writeFile(join(root, 'config.json'), '{}', 'utf8')
    try {
      await invoke({ version: 1, command: 'personal-account-update', settings: { account: 'employee.001', password: 'forbidden' } }, root)
      assert.fail('personal account update must reject extra fields')
    } catch (error) {
      assert.equal(error.value.ok, false)
      assert.equal(error.value.error.code, 'INVALID_CONFIGURATION')
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('personal automation reports readiness without exposing credentials', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-personal-automation-'))
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({
      username: 'manager.user', personal_account: 'employee.001',
      personal_schedule_enabled: true, personal_schedule_times: ['09:15', '18:15'],
    }), 'utf8')
    await writeFile(join(root, 'keyring_utils.py'), [
      'def get_password(username): return "stored-secret"',
      'def mask_account(username): return "masked"',
    ].join('\n'), 'utf8')
    const value = await invoke({ version: 1, command: 'personal-automation-read' }, root)
    assert.equal(value.ok, true)
    assert.equal(value.data.accountConfigured, true)
    assert.equal(value.data.loginReady, true)
    assert.deepEqual(value.data.schedule, { enabled: true, times: ['09:15', '18:15'] })
    assert.equal(JSON.stringify(value).includes('stored-secret'), false)
    assert.equal(JSON.stringify(value).includes('manager.user'), false)
    assert.equal(JSON.stringify(value).includes('employee.001'), false)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('personal run and schedule commands reject unscoped input before side effects', async () => {
  for (const request of [
    { version: 1, command: 'personal-run-start', settings: { command: 'whoami' } },
    { version: 1, command: 'personal-schedule-update', settings: { enabled: true, times: ['09:15'], path: 'C:/Windows' } },
  ]) {
    try {
      await invoke(request)
      assert.fail('unscoped personal automation input must be rejected')
    } catch (error) {
      assert.equal(error.value.ok, false)
      assert.equal(error.value.error.code, 'INVALID_CONFIGURATION')
    }
  }
})

test('configuration stores credentials as DPAPI-protected data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-sqlite-credentials-'))
  try {
    await writeFile(join(root, 'config.json'), '{}\n', 'utf8')
    const saved = await invoke({ version: 1, command: 'configuration-update', settings: {
      username: 'sqlite.user', password: 'not-a-real-secret', browserChannel: 'chrome',
      overnightExemptAttendance: true, overnightCheckWorkHours: false,
    } }, root)
    assert.equal(saved.ok, true)
    assert.equal(saved.data.passwordConfigured, true)
    assert.equal(JSON.stringify(saved).includes('not-a-real-secret'), false)
    const view = await invoke({ version: 1, command: 'configuration-read' }, root)
    assert.equal(view.data.passwordConfigured, true)
    const rows = await readDatabase(join(root, 'iepms-attendance-plugin.db'), 'SELECT username, password FROM plugin_credentials')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].username, 'sqlite.user')
    assert.match(rows[0].password, /^dpapi:v1:/)
    assert.equal(rows[0].password.includes('not-a-real-secret'), false)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('management roster imports Excel once, then preserves hidden webhooks in the database', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-roster-'))
  try {
    await writeFile(join(root, 'config.json'), '{}', 'utf8')
    await writeRoster(join(root, 'roster.xlsx'), [
      ['Alpha', 'P-1', 'Alice', '上海', 'employee.001', 'https://example.invalid/secret-hook', '13800000000', 'ding-1'],
    ])
    const before = await invoke({ version: 1, command: 'roster-read' }, root)
    assert.equal(before.ok, true)
    assert.equal(before.data.rows.length, 1)
    assert.equal(before.data.rows[0].webhookConfigured, true)
    assert.equal(JSON.stringify(before).includes('secret-hook'), false)

    const value = await invoke({ version: 1, command: 'roster-update', settings: { rows: [
      { ...before.data.rows[0], city: '苏州' },
      { rowId: '', projectName: 'Beta', projectCode: 'P-2', name: 'Bob', city: '杭州', account: 'employee.002', mobile: '', dingtalkId: '', webhookConfigured: false },
    ] } }, root)
    assert.equal(value.ok, true)
    assert.equal(value.data.rows.length, 2)
    assert.equal(value.data.backupAvailable, false)
    assert.equal(JSON.stringify(value).includes('secret-hook'), false)
    const stored = await readDatabase(join(root, 'iepms-attendance-plugin.db'), 'SELECT city, account, webhook FROM roster ORDER BY display_order')
    assert.deepEqual(stored.map(row => [row.city, row.account]), [['苏州', 'employee.001'], ['杭州', 'employee.002']])
    assert.equal(stored[0].webhook, 'https://example.invalid/secret-hook')
    const legacy = await readRoster(join(root, 'roster.xlsx'))
    assert.equal(legacy.length, 2)
    assert.equal(legacy[1][3], '上海')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('personal roster updates exactly the row bound to the personal account', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-personal-roster-'))
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({ username: 'manager.user', personal_account: 'employee.001' }), 'utf8')
    await writeRoster(join(root, 'roster.xlsx'), [
      ['Alpha', 'P-1', 'Alice', '上海', 'employee.001', 'https://example.invalid/personal-secret', '13800000000', 'ding-1'],
      ['Beta', 'P-2', 'Bob', '杭州', 'employee.002', '', '', ''],
    ])
    const before = await invoke({ version: 1, command: 'personal-roster-read' }, root)
    assert.equal(before.data.configured, true)
    assert.equal(before.data.duplicateCount, 1)
    assert.equal(before.data.row.account, '')
    assert.equal(JSON.stringify(before).includes('employee.001'), false)
    assert.equal(JSON.stringify(before).includes('personal-secret'), false)

    const value = await invoke({ version: 1, command: 'personal-roster-update', settings: { row: {
      ...before.data.row, name: 'Alice Updated', city: '苏州', account: 'forged.account',
    } } }, root)
    assert.equal(value.ok, true)
    assert.equal(value.data.row.name, 'Alice Updated')
    assert.equal(value.data.row.account, '')
    const stored = await readDatabase(join(root, 'iepms-attendance-plugin.db'), 'SELECT name, city, account, webhook FROM roster ORDER BY display_order')
    assert.deepEqual(stored.map(row => [row.name, row.city, row.account]), [['Alice Updated', '苏州', 'employee.001'], ['Bob', '杭州', 'employee.002']])
    assert.equal(stored[0].webhook, 'https://example.invalid/personal-secret')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('personal makeup applies the 72-hour cutoff and stores only a local pending request', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-personal-makeup-'))
  const duringWindow = { IEPMS_BRIDGE_TEST_NOW: '2026-10-15T23:59:59' }
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({ personal_account: 'employee.001' }), 'utf8')
    await writeFile(join(root, 'keyring_utils.py'), [
      'def get_password(username): return "stored"',
      'def mask_account(username): return "masked"',
    ].join('\n'), 'utf8')
    await writeFile(join(root, 'last_attendance_data.json'), JSON.stringify({
      date: '2026-10-13',
      morning: [{ '打卡账号': 'employee.001', '上班状态': '缺卡' }], evening: [],
    }), 'utf8')
    const before = await invoke({ version: 1, command: 'personal-makeup-read' }, root, duringWindow)
    assert.deepEqual(before.data.items.map(item => [item.attendanceDate, item.mode, item.deadline]), [['2026-10-13', 'makeup', '2026-10-15 23:59']])
    assert.deepEqual(before.data.items[0].overtimeReminderDates, ['2026-10-17', '2026-10-18'])
    const submitted = await invoke({ version: 1, command: 'personal-makeup-submit', settings: { attendanceDate: '2026-10-13', reason: '漏打卡' } }, root, duringWindow)
    assert.equal(submitted.ok, true)
    assert.equal(submitted.data.items[0].mode, 'submitted')
    assert.equal(submitted.data.items[0].application.kind, 'makeup')
    const stored = await readDatabase(join(root, 'iepms-attendance-plugin.db'), 'SELECT account_hash, attendance_date, request_kind, overtime_date, status FROM personal_makeup_requests')
    assert.deepEqual(stored.map(row => [row.attendance_date, row.request_kind, row.overtime_date, row.status]), [['2026-10-13', 'makeup', '', 'local-pending']])
    assert.equal(JSON.stringify(stored).includes('employee.001'), false)
    try {
      await invoke({ version: 1, command: 'personal-makeup-submit', settings: { attendanceDate: '2026-10-13' } }, root, duringWindow)
      assert.fail('duplicate local makeup request must be rejected')
    } catch (error) {
      assert.equal(error.value.error.code, 'INVALID_CONFIGURATION')
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('expired makeup requires a past non-working overtime date', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-overtime-makeup-'))
  const expired = { IEPMS_BRIDGE_TEST_NOW: '2026-10-13T00:00:00' }
  try {
    await writeFile(join(root, 'config.json'), JSON.stringify({ personal_account: 'employee.001' }), 'utf8')
    await writeFile(join(root, 'keyring_utils.py'), [
      'def get_password(username): return "stored"',
      'def mask_account(username): return "masked"',
    ].join('\n'), 'utf8')
    await writeFile(join(root, 'last_attendance_data.json'), JSON.stringify({
      date: '2026-10-01',
      morning: [{ '打卡账号': 'employee.001', '上班状态': '缺卡' }], evening: [],
    }), 'utf8')
    const before = await invoke({ version: 1, command: 'personal-makeup-read' }, root, expired)
    assert.equal(before.data.items[0].mode, 'overtime')
    try {
      await invoke({ version: 1, command: 'personal-makeup-submit', settings: { attendanceDate: '2026-10-01', overtimeDate: '2026-10-12' } }, root, expired)
      assert.fail('weekday overtime makeup must be rejected')
    } catch (error) {
      assert.equal(error.value.error.code, 'INVALID_CONFIGURATION')
      assert.match(error.value.error.message, /非工作日/)
    }
    const submitted = await invoke({ version: 1, command: 'personal-makeup-submit', settings: { attendanceDate: '2026-10-01', overtimeDate: '2026-03-15', reason: '周末加班' } }, root, expired)
    assert.equal(submitted.data.items[0].application.kind, 'overtime')
    assert.equal(submitted.data.items[0].application.overtimeDate, '2026-03-15')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('plugin client is restricted to the local dashboard API', async () => {
  const source = await readFile(new URL('../src/client.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/client.css', import.meta.url), 'utf8')
  const contracts = await readFile(new URL('../src/contracts.ts', import.meta.url), 'utf8')
  const bridge = await readFile(new URL('../src/bridge.ts', import.meta.url), 'utf8')
  const bootstrap = await readFile(new URL('../src/runtime-bootstrap.ts', import.meta.url), 'utf8')
  const pluginConfig = await readFile(new URL('../src/config.ts', import.meta.url), 'utf8')
  const bridgeSource = await readFile(new URL('../backend/iepms_bridge.py', import.meta.url), 'utf8')
  const personalRun = bridgeSource.slice(bridgeSource.indexOf('def run_personal_inspection'), bridgeSource.indexOf('\ndef redact_log_line'))
  assert.match(source, /API_PREFIX/)
  assert.match(source, /iepms-attendance-scroll/)
  assert.match(styles, /\.iepms-attendance-scroll[^}]*overflow-y:auto/)
  assert.match(source, /makeupReminderForDate/)
  assert.match(source, /overtimeReminderDates/)
  assert.match(source, /iepms-calendar-makeup-legend/)
  assert.match(source, /可加班补卡/)
  assert.doesNotMatch(source, /PersonalMakeupItemForm/)
  assert.match(styles, /\.iepms-calendar-makeup-legend/)
  assert.match(styles, /\.iepms-calendar-day\.is-overtime-reminder/)
  assert.match(bridgeSource, /def overtime_reminder_dates/)
  assert.doesNotMatch(bridgeSource, /IEPMS_BACKEND_ROOT/)
  assert.match(bridgeSource, /RUNTIME_ROOT/)
  assert.match(contracts, /iepms-attendance-local\/v1/)
  assert.match(source, /结果只在插件内提醒/)
  assert.match(source, /首次使用会自动下载并安装依赖/)
  assert.doesNotMatch(personalRun, /send_dingtalk|default_webhook|webhook_url/i)
  assert.match(source, /management-run/)
  assert.match(bridge, /prepareRuntime/)
  assert.match(bootstrap, /-m', 'venv/)
  assert.match(bootstrap, /python-runtime/)
  assert.match(bootstrap, /pypi\.org/)
  assert.match(pluginConfig, /mirrors\.aliyun\.com/)
  assert.match(pluginConfig, /pythonPackageIndex/)
  assert.doesNotMatch(source, /pip install/)
  assert.match(bridgeSource, /def start_management_run/)
  assert.match(bridgeSource, /def management_log/)
})

test('bundled runtime has no legacy machine-bound activation gate', async () => {
  const autoSignin = await readFile(new URL('../backend/runtime/iepms_auto_signin.py', import.meta.url), 'utf8')
  const monitor = await readFile(new URL('../backend/runtime/iepms_attendance_monitor.py', import.meta.url), 'utf8')
  const bridgeSource = await readFile(new URL('../backend/iepms_bridge.py', import.meta.url), 'utf8')
  const licenseModule = new URL('../backend/runtime/license_manager.py', import.meta.url)

  for (const source of [autoSignin, monitor, bridgeSource]) {
    assert.doesNotMatch(source, /license_manager|require_activation|软件未激活/)
  }
  await assert.rejects(readFile(licenseModule, 'utf8'))
})

test('management analytics separates pending, completed, and expired missing cards without exposing accounts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'iepms-analytics-'))
  try {
    await writeFile(join(root, 'config.json'), '{}', 'utf8')
    await writeRoster(join(root, 'roster.xlsx'), [
      ['Alpha', 'P-1', 'Alice', '上海', 'employee.001', '', '', ''],
      ['Alpha', 'P-1', 'Bob', '上海', 'employee.002', '', '', ''],
      ['Beta', 'P-2', 'Carol', '杭州', 'employee.003', '', '', ''],
    ])
    await writeFile(join(root, 'management_attendance_sync.json'), JSON.stringify({ capturedAt: '2026-10-15T12:00:00', records: [
      { account: 'employee.001', date: '2026-10-10', clockIn: '', clockOut: '', workMinutes: null, status: 'missing' },
      { account: 'employee.001', date: '2026-10-13', clockIn: '', clockOut: '', workMinutes: null, status: 'missing' },
      { account: 'employee.001', date: '2026-10-14', clockIn: '08:30', clockOut: '18:00', workMinutes: 570, status: 'normal' },
      { account: 'employee.002', date: '2026-10-10', clockIn: '08:30', clockOut: '18:00', workMinutes: 570, status: 'normal' },
      { account: 'employee.002', date: '2026-10-13', clockIn: '08:30', clockOut: '18:00', workMinutes: 570, status: 'normal' },
      { account: 'employee.002', date: '2026-10-14', clockIn: '08:30', clockOut: '18:00', workMinutes: 570, status: 'normal' },
      { account: 'employee.003', date: '2026-10-10', clockIn: '', clockOut: '', workMinutes: null, status: 'missing' },
      { account: 'employee.003', date: '2026-10-13', clockIn: '08:30', clockOut: '17:00', workMinutes: 510, status: 'normal' },
      { account: 'employee.003', date: '2026-10-14', clockIn: '08:30', clockOut: '17:00', workMinutes: 510, status: 'normal' },
    ] }), 'utf8')
    const initial = await invoke({ version: 1, command: 'management-analytics-read', settings: { month: '2026-10', page: 1, pageSize: 20, sortBy: 'missing', sortDirection: 'desc' } }, root, { IEPMS_BRIDGE_TEST_NOW: '2026-10-15T12:00:00' })
    assert.equal(initial.ok, true)
    assert.equal(initial.data.coverage.coveredWorkdays, 3)
    assert.equal(initial.data.metrics.missingCount, 3)
    assert.equal(initial.data.metrics.pendingMakeupCount, 1)
    assert.equal(JSON.stringify(initial).includes('employee.001'), false)
    const alice = initial.data.rows.find(row => row.name === 'Alice')
    const carol = initial.data.rows.find(row => row.name === 'Carol')
    assert.equal(alice.pendingMakeupCount, 1)
    assert.equal(alice.expiredMissingCount, 1)
    assert.equal(carol.expiredMissingCount, 1)
    await runPython([
      'import hashlib, sqlite3, sys',
      'path = sys.stdin.read()',
      'connection = sqlite3.connect(path)',
      'key = hashlib.sha256(b"employee.001").hexdigest()',
      "connection.execute(\"INSERT INTO personal_makeup_requests (account_hash, attendance_date, request_kind, overtime_date, reason, status, created_at, updated_at) VALUES (?, '2026-10-10', 'makeup', '', '', 'approved', '2026-10-11', '2026-10-11')\", (key,))",
      'connection.commit()',
    ].join('\n'), join(root, 'iepms-attendance-plugin.db'))
    const updated = await invoke({ version: 1, command: 'management-analytics-read', settings: { month: '2026-10', group: 'Alpha', page: 1, pageSize: 1, sortBy: 'name', sortDirection: 'asc' } }, root, { IEPMS_BRIDGE_TEST_NOW: '2026-10-15T12:00:00' })
    assert.equal(updated.data.pagination.total, 2)
    assert.equal(updated.data.rows[0].name, 'Alice')
    assert.equal(updated.data.rows[0].madeUpCount, 1)
    assert.equal(updated.data.rows[0].expiredMissingCount, 0)
    const detail = await invoke({ version: 1, command: 'management-analytics-person-read', settings: { month: '2026-10', personKey: alice.personKey, page: 1, pageSize: 20, sortBy: 'missing', sortDirection: 'desc' } }, root, { IEPMS_BRIDGE_TEST_NOW: '2026-10-15T12:00:00' })
    assert.equal(detail.data.person.name, 'Alice')
    assert.equal(detail.data.records.find(row => row.date === '2026-10-10').resolution, 'made-up')
  } finally { await rm(root, { recursive: true, force: true }) }
})
