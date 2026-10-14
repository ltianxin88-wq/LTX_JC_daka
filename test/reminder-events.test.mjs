import assert from 'node:assert/strict'
import test from 'node:test'

const { assertAttendanceReminderEvent, reminderEventsForResult } = await import('../lib/reminder-events.js')

const settings = { startupInspection: true, usePet: true, fallbackNotification: true, nightSafety: false, shiftType: 'day' }

test('creates a versioned missing-clock reminder without raw attendance details', () => {
  const [event] = reminderEventsForResult({ operationId: 'op', state: 'success', message: '', attendance: { date: '2026-10-14', status: 'missing' } }, settings, new Date('2026-10-14T10:00:00+08:00'))
  assert.equal(event.version, 1)
  assert.equal(event.type, 'missing-clock-in')
  assert.equal(event.attendanceDate, '2026-10-14')
  assert.equal(JSON.stringify(event).includes('account'), false)
  assert.deepEqual(assertAttendanceReminderEvent(event), event)
})

test('night safety is opt-in and independent from missing attendance', () => {
  const events = reminderEventsForResult(
    { operationId: 'op', state: 'success', message: '', attendance: { date: '2026-10-14', status: 'normal' } },
    { ...settings, nightSafety: true, shiftType: 'night' },
    new Date('2026-10-14T22:00:00+08:00'),
  )
  assert.deepEqual(events.map(event => event.type), ['night-safety'])
})

test('sync failure never becomes a missing-clock claim', () => {
  const events = reminderEventsForResult({ operationId: 'op', state: 'error', message: 'secret backend detail' }, settings)
  assert.equal(events[0].type, 'sync-failed')
  assert.doesNotMatch(events[0].body, /未打卡/u)
  assert.doesNotMatch(events[0].body, /secret/u)
})
