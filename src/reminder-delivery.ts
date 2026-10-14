import type { AttendanceBridge } from './bridge.js'
import type { AttendanceReminderChannel, PersonalReminderSettings } from './contracts.js'
import type { AttendanceReminderEvent } from './reminder-events.js'
import type { RuntimeContextLike } from './runtime.js'

export interface PetReminderIntegration {
  announceAttendanceReminder?(event: AttendanceReminderEvent): { ok: boolean }
}

interface DesktopNotificationService {
  show?(input: { title: string; body: string }): void | Promise<void>
  notify?(input: { title: string; body: string }): void | Promise<void>
}

export async function deliverReminder(
  runtime: RuntimeContextLike,
  bridge: AttendanceBridge,
  pet: PetReminderIntegration | undefined,
  event: AttendanceReminderEvent,
  settings: PersonalReminderSettings,
): Promise<AttendanceReminderChannel | undefined> {
  const preferred: AttendanceReminderChannel = settings.usePet && pet?.announceAttendanceReminder !== undefined ? 'pet' : 'plugin'
  const reservation = await bridge.reservePersonalReminder({
    eventId: event.id,
    attendanceDate: event.attendanceDate,
    type: event.type,
    channel: preferred,
    expiresAt: event.expiresAt,
  })
  if (!reservation.allowed) return undefined

  if (preferred === 'pet') {
    try {
      if (pet?.announceAttendanceReminder?.(event).ok === true) {
        await bridge.completePersonalReminder({ eventId: event.id, channel: 'pet', status: 'delivered' })
        return 'pet'
      }
    } catch {}
  }

  if (settings.fallbackNotification) {
    const notification = readDesktopNotification(runtime)
    if (notification !== undefined) {
      try {
        const input = { title: event.title, body: event.body }
        if (notification.show !== undefined) await notification.show(input)
        else await notification.notify?.(input)
        await bridge.completePersonalReminder({ eventId: event.id, channel: 'desktop', status: 'delivered' })
        return 'desktop'
      } catch {}
    }
  }

  await bridge.completePersonalReminder({ eventId: event.id, channel: 'plugin', status: 'delivered' })
  runtime.logger.info(`iepms-attendance-plugin: reminder ${event.type} stored for plugin fallback`)
  return 'plugin'
}

function readDesktopNotification(runtime: RuntimeContextLike): DesktopNotificationService | undefined {
  for (const name of ['notification', 'desktopNotification']) {
    try {
      const value = runtime.get(name, false) as DesktopNotificationService | undefined
      if (value !== undefined && (typeof value.show === 'function' || typeof value.notify === 'function')) return value
    } catch {}
  }
  return undefined
}
