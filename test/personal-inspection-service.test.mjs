import assert from 'node:assert/strict'
import test from 'node:test'

const { createPersonalInspectionService } = await import('../lib/personal-inspection-service.js')

function bridgeFor({ state = 'running', message = '正在同步个人考勤记录。', records = [], workdays = [], scheduleEnabled = true } = {}) {
  return {
    startCalls: 0,
    async startPersonalRun() {
      this.startCalls += 1
      return { state, message }
    },
    async read(command) {
      if (command === 'personal-automation-read') return { state, message, schedule: { enabled: scheduleEnabled, times: ['09:15'] } }
      return { configured: true, records, calendar: { workdays }, accountMasked: '***', source: { latestAvailable: true, historyDays: 1 } }
    },
  }
}

test('startup inspection only runs for a configured account with enabled personal scheduling', async () => {
  const disabled = bridgeFor({ scheduleEnabled: false })
  assert.equal(await createPersonalInspectionService(disabled).startAutomatic(), undefined)
  assert.equal(disabled.startCalls, 0)
  const enabled = bridgeFor({ scheduleEnabled: true })
  const started = await createPersonalInspectionService(enabled).startAutomatic()
  assert.equal(started?.state, 'running')
  assert.equal(enabled.startCalls, 1)
})

test('requires a user-initiated request and never accepts arbitrary command input', async () => {
  const service = createPersonalInspectionService(bridgeFor())
  await assert.rejects(() => service.start({ userInitiated: false, requestId: 'button-1' }), /用户按钮/)
  await assert.rejects(() => service.start({ userInitiated: true, requestId: '' }), /请求标识/)
})

test('deduplicates a PET button request and exposes only a scoped running status', async () => {
  const bridge = bridgeFor()
  const service = createPersonalInspectionService(bridge)
  const first = await service.start({ userInitiated: true, requestId: 'button-1' })
  const second = await service.start({ userInitiated: true, requestId: 'button-1' })
  assert.equal(bridge.startCalls, 1)
  assert.equal(first.operationId, second.operationId)
  assert.equal(second.state, 'running')
  assert.equal('accountConfigured' in second, false)
  assert.equal('requestId' in second, false)
})

test('returns a sanitized attendance conclusion after the personal run completes', async () => {
  const date = new Date()
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const bridge = bridgeFor({ state: 'success', message: '同步完成', records: [{ date: today, clockIn: '09:00', clockOut: '', workMinutes: null, status: 'checked-in' }], workdays: [today] })
  const service = createPersonalInspectionService(bridge)
  const started = await service.start({ userInitiated: true, requestId: 'button-2' })
  const result = await service.status(started.operationId)
  assert.deepEqual(result.attendance, { date: today, status: 'checked-in' })
  assert.equal(result.message, '个人巡检已完成。')
  assert.equal(JSON.stringify(result).includes('09:00'), false)
})
