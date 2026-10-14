import test from 'node:test'
import assert from 'node:assert/strict'

const { installPetAttendanceIntegration, toPetAnnouncement } = await import('../lib/pet-integration.js')

function runtimeWith(pet) {
  return {
    get(name) {
      return name === 'pet' ? pet : undefined
    },
    logger: { info() {}, warn() {}, error() {} },
    effect() {},
  }
}

test('does not require PET and still performs startup inspection', async () => {
  let automatic = 0
  const service = {
    async startAutomatic() { automatic += 1; return undefined },
    async start() { throw new Error('not expected') },
    async status() { throw new Error('not expected') },
  }
  const dispose = installPetAttendanceIntegration(runtimeWith(undefined), service, { wait: async () => {} })
  await new Promise(resolve => setImmediate(resolve))
  dispose()
  assert.equal(automatic, 1)
})

test('registers a PET action and maps a successful button inspection', async () => {
  const announcements = []
  let action
  let starts = 0
  const pet = {
    announce(value) { announcements.push(value); return { ok: true } },
    registerPanelAction(value) { action = value; return () => { action = undefined } },
  }
  const service = {
    async startAutomatic() { return undefined },
    async start(request) {
      starts += 1
      assert.equal(request.userInitiated, true)
      assert.match(request.requestId, /^pet-panel-/u)
      return { operationId: 'op-1', state: 'success', message: '完成', attendance: { date: '2026-10-14', status: 'normal' } }
    },
    async status() { throw new Error('status is not needed') },
  }
  const dispose = installPetAttendanceIntegration(runtimeWith(pet), service, { wait: async () => {} })
  assert.equal(action.id, 'attendance-check')
  await new Promise(resolve => setImmediate(resolve))
  await action.onSelect()
  dispose()
  assert.equal(starts, 1)
  const final = announcements.at(-1)
  assert.equal(final.note, '今日打卡正常。')
  assert.equal(final.tone, 'ok')
  assert.equal('account' in final, false)
})

test('repeated PET clicks do not start concurrent inspections', async () => {
  let resolveStart
  let starts = 0
  let action
  const pet = { announce() { return { ok: true } }, registerPanelAction(value) { action = value; return () => {} } }
  const service = {
    async startAutomatic() { return undefined },
    async start() {
      starts += 1
      await new Promise(resolve => { resolveStart = resolve })
      return { operationId: 'op-2', state: 'success', message: '完成', attendance: { date: '2026-10-14', status: 'missing' } }
    },
    async status() { throw new Error('status is not needed') },
  }
  const dispose = installPetAttendanceIntegration(runtimeWith(pet), service, { wait: async () => {} })
  const first = action.onSelect()
  await new Promise(resolve => setImmediate(resolve))
  const second = action.onSelect()
  resolveStart()
  await Promise.all([first, second])
  dispose()
  assert.equal(starts, 1)
})

test('maps missing and unavailable states without claiming a false absence', () => {
  const missing = toPetAnnouncement({ operationId: 'x', state: 'success', message: '', attendance: { date: '2026-10-14', status: 'missing' } })
  assert.match(missing.note, /尚未查询到上班打卡/u)
  const unavailable = toPetAnnouncement({ operationId: 'x', state: 'error', message: 'bridge failed' })
  assert.match(unavailable.note, /无法确认打卡状态/u)
  assert.equal(unavailable.tone, 'low')
})

test('reports a moving inspection progress and completes at 100 percent', () => {
  const running = toPetAnnouncement({ operationId: 'x', state: 'running', message: '' }, 42)
  const finished = toPetAnnouncement({ operationId: 'x', state: 'success', message: '', attendance: { date: '2026-10-14', status: 'normal' } })
  assert.equal(running.percent, 42)
  assert.equal(finished.percent, 100)
})
