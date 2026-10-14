import { randomUUID } from 'node:crypto';
export function reminderEventsForResult(result, settings, now = new Date()) {
    const attendanceDate = result.attendance?.date ?? localDate(now);
    const events = [];
    if (result.state === 'error') {
        events.push(createEvent('sync-failed', attendanceDate, '考勤同步未完成', '暂时无法确认打卡状态，请稍后重试。', 'warning', 'open-attendance', now));
    }
    else if (result.state === 'success') {
        const status = result.attendance?.status;
        if (status === 'missing' || status === 'pending') {
            events.push(createEvent('missing-clock-in', attendanceDate, '打卡提醒', '今日尚未查询到上班打卡，请确认是否已完成打卡。', 'urgent', 'open-attendance', now));
        }
        else if (status === 'checked-in') {
            events.push(createEvent('missing-clock-out', attendanceDate, '下班打卡提醒', '已查询到上班打卡，尚未查询到下班打卡。', 'warning', 'open-attendance', now));
        }
        if (settings.shiftType === 'night' && settings.nightSafety) {
            events.push(createEvent('night-safety', attendanceDate, '夜班安全提醒', '夜班辛苦了，请注意通勤安全并合理安排休息。', 'info', 'none', now));
        }
    }
    return events;
}
export function assertAttendanceReminderEvent(input) {
    if (input === null || typeof input !== 'object')
        throw new Error('考勤提醒事件格式无效。');
    const value = input;
    const types = ['missing-clock-in', 'missing-clock-out', 'makeup-window', 'night-safety', 'sync-failed'];
    if (value.version !== 1 || typeof value.id !== 'string' || !types.includes(value.type))
        throw new Error('考勤提醒事件版本或类型无效。');
    if (typeof value.occurredAt !== 'string' || typeof value.attendanceDate !== 'string' || typeof value.expiresAt !== 'string')
        throw new Error('考勤提醒事件时间无效。');
    if (!['info', 'warning', 'urgent'].includes(String(value.priority)) || typeof value.title !== 'string' || typeof value.body !== 'string')
        throw new Error('考勤提醒事件内容无效。');
    if (!['open-attendance', 'none'].includes(String(value.action)))
        throw new Error('考勤提醒事件操作无效。');
    if (value.title.length > 80 || value.body.length > 160)
        throw new Error('考勤提醒事件内容过长。');
    return value;
}
function createEvent(type, attendanceDate, title, body, priority, action, now) {
    return {
        version: 1,
        id: `attendance-${randomUUID()}`,
        occurredAt: now.toISOString(),
        attendanceDate,
        type,
        priority,
        title,
        body,
        action,
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    };
}
function localDate(now) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
//# sourceMappingURL=reminder-events.js.map