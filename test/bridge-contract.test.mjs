import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const bridge = fileURLToPath(new URL('../backend/iepms_bridge.py', import.meta.url))
const backendRoot = 'D:/dingding/daka'

async function invoke(request, root = backendRoot, environment = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn('python', [bridge], { env: { ...processEnv(), IEPMS_BACKEND_ROOT: root, PYTHONUTF8: '1', ...environment }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
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
  assert.equal(value.data.application.name, 'iEPMS 考勤自动监控系统')
  assert.equal(value.data.safety.mode, 'read-only')
  assert.equal(value.data.safety.automaticActionsEnabled, false)
  assert.equal(typeof value.data.configuration.accountConfigured, 'boolean')
  assert.equal(typeof value.data.configuration.webhookConfigured, 'boolean')
  assert.equal(JSON.stringify(value).includes('default_webhook'), false)
})

test('bridge rejects side-effect commands and unexpected parameters', async () => {
  for (const request of [
    { version: 1, command: 'run-check' },
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
    const value = await invoke({ version: 1, command: 'personal-attendance' }, root)
    assert.equal(value.ok, true)
    assert.equal(value.data.configured, true)
    assert.equal(value.data.accountMasked, 'te****er')
    assert.deepEqual(value.data.records, [{ date: '2026-10-13', clockIn: '08:52', clockOut: '18:03', workMinutes: 552, status: 'normal' }])
    const serialized = JSON.stringify(value)
    for (const secret of ['Target Person', 'Other Person', 'Private Project', 'Other Project', 'test.user', 'other.user']) assert.equal(serialized.includes(secret), false)
    const history = await readDatabase(join(root, 'iepms-attendance-plugin.db'), 'SELECT account_hash, attendance_date FROM personal_history')
    assert.equal(history.length, 1)
    assert.equal(JSON.stringify(history).includes('test.user'), false)
  } finally { await rm(root, { recursive: true, force: true }) }
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
  const bridgeSource = await readFile(new URL('../backend/iepms_bridge.py', import.meta.url), 'utf8')
  const personalRun = bridgeSource.slice(bridgeSource.indexOf('def run_personal_inspection'), bridgeSource.indexOf('\ndef redact_log_line'))
  assert.match(source, /API_PREFIX/)
  assert.match(source, /iepms-attendance-scroll/)
  assert.match(styles, /\.iepms-attendance-scroll[^}]*overflow-y:auto/)
  assert.match(source, /makeupReminderForDate/)
  assert.match(source, /iepms-calendar-makeup-legend/)
  assert.match(source, /可加班补卡/)
  assert.doesNotMatch(source, /PersonalMakeupItemForm/)
  assert.match(styles, /\.iepms-calendar-makeup-legend/)
  assert.match(styles, /\.iepms-calendar-day\.is-overtime-reminder/)
  assert.match(contracts, /iepms-attendance-local\/v1/)
  assert.match(source, /结果只在插件内提醒/)
  assert.doesNotMatch(personalRun, /send_dingtalk|default_webhook|webhook_url/i)
  assert.doesNotMatch(source, /['"](?:run-check|refresh-session|schedule-update|dingtalk)['"]/i)
})
