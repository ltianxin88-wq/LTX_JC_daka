import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const bridge = fileURLToPath(new URL('../backend/iepms_bridge.py', import.meta.url))
const backendRoot = 'D:/dingding/daka'

async function invoke(request, root = backendRoot) {
  return new Promise((resolve, reject) => {
    const process = spawn('python', [bridge], { env: { ...processEnv(), IEPMS_BACKEND_ROOT: root, PYTHONUTF8: '1' }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
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

test('plugin client is restricted to the local dashboard API', async () => {
  const source = await readFile(new URL('../src/client.tsx', import.meta.url), 'utf8')
  const contracts = await readFile(new URL('../src/contracts.ts', import.meta.url), 'utf8')
  assert.match(source, /API_PREFIX/)
  assert.match(contracts, /iepms-attendance-local\/v1/)
  assert.doesNotMatch(source, /run-check|refresh-session|schedule-update|dingtalk/i)
})
