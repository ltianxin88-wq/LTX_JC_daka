import assert from 'node:assert/strict'
import test from 'node:test'

const { createPersonalInspectionService } = await import('../lib/personal-inspection-service.js')

function bridgeFor({ state = 'running', message = '正在同步个人考勤记录。', records = [], workdays, startupInspection = true, shiftType = 'day', claimed = true } = {}) {
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    startCalls: 0,
    claimCalls: 0,
    async startPersonalRun() {
      this.startCalls += 1
      return { state, message }
    },
    async read(command) {
      if (command === 'personal-automation-read') return { state, message, schedule: { enabled: false, times: [] }, reminders: { startupInspection, usePet: true, fallbackNotification: true, nightSafety: false, shiftType }, lastReminder: null }
      return { configured: true, records, calendar: { workdays: workdays ?? [date] }, accountMasked: '***', source: { latestAvailable: true, historyDays: 1 } }
    },
    async claimPersonalStartup() { this.claimCalls += 1; return { claimed } },
  }
}

test('startup inspection uses its independent opt-in and persistent daily claim', async () => {
  const disabled = bridgeFor({ startupInspection: false })
  assert.equal(await createPersonalInspectionService(disabled).startAutomatic(), undefined)
  assert.equal(disabled.startCalls, 0)
  const enabled = bridgeFor({ startupInspection: true })
  const started = await createPersonalInspectionService(enabled).startAutomatic()
  assert.equal(started?.state, 'running')
  assert.equal(enabled.startCalls, 1)
  const duplicate = bridgeFor({ claimed: false })
  assert.equal(await createPersonalInspectionService(duplicate).startAutomatic(), undefined)
  assert.equal(duplicate.startCalls, 0)
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
