export async function deliverReminder(runtime, bridge, pet, event, settings) {
    const preferred = settings.usePet && pet?.announceAttendanceReminder !== undefined ? 'pet' : 'plugin';
    const reservation = await bridge.reservePersonalReminder({
        eventId: event.id,
        attendanceDate: event.attendanceDate,
        type: event.type,
        channel: preferred,
        expiresAt: event.expiresAt,
    });
    if (!reservation.allowed)
        return undefined;
    if (preferred === 'pet') {
        try {
            if (pet?.announceAttendanceReminder?.(event).ok === true) {
                await bridge.completePersonalReminder({ eventId: event.id, channel: 'pet', status: 'delivered' });
                return 'pet';
            }
        }
        catch { }
    }
    if (settings.fallbackNotification) {
        const notification = readDesktopNotification(runtime);
        if (notification !== undefined) {
            try {
                const input = { title: event.title, body: event.body };
                if (notification.show !== undefined)
                    await notification.show(input);
                else
                    await notification.notify?.(input);
                await bridge.completePersonalReminder({ eventId: event.id, channel: 'desktop', status: 'delivered' });
                return 'desktop';
            }
            catch { }
        }
    }
    await bridge.completePersonalReminder({ eventId: event.id, channel: 'plugin', status: 'delivered' });
    runtime.logger.info(`iepms-attendance-plugin: reminder ${event.type} stored for plugin fallback`);
    return 'plugin';
}
function readDesktopNotification(runtime) {
    for (const name of ['notification', 'desktopNotification']) {
        try {
            const value = runtime.get(name, false);
            if (value !== undefined && (typeof value.show === 'function' || typeof value.notify === 'function'))
                return value;
        }
        catch { }
    }
    return undefined;
}
//# sourceMappingURL=reminder-delivery.js.map