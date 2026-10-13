# -*- coding: utf-8 -*-
"""
attendance_alerts.py - 考勤告警文案生成与消息合并
=================================================
业务说明：
1. 消息合并：将同一项目的下班缺卡名单与 8 小时工时不足名单合并为单条钉钉消息，避免群内刷屏。
2. 收件人去重：合并缺卡与工时不足人员的手机号与钉钉 ID。
"""


def _unique(values):
    return list(dict.fromkeys(value for value in values if value))


def compose_evening_alert(project_name, total_need, total_done, missing_persons,
                          missing_mobiles, missing_dingtalk_ids, short_hour_persons,
                          short_hour_mobiles, short_hour_dingtalk_ids):
    """合并下班缺卡与工时不足告警，并返回统一的收件人和指纹元素。"""
    missing_persons = list(missing_persons or [])
    short_hour_persons = list(short_hour_persons or [])

    if missing_persons:
        missing_text = ", ".join(missing_persons)
        clockout_line = (
            f"[下班卡] {project_name}, 需打下班卡{total_need}人, "
            f"实际打卡{total_done}人, {missing_text}未打下班卡"
        )
    elif total_need > 0:
        clockout_line = (
            f"[下班卡] {project_name}, 需打下班卡{total_need}人, "
            f"实际打卡{total_done}人, 已全部完成打卡"
        )
    else:
        clockout_line = ""

    message_lines = [clockout_line] if clockout_line else []
    if short_hour_persons:
        short_text = ", ".join(short_hour_persons)
        message_lines.append(
            f"[工时不足] {project_name}, {short_text}打卡时间不足8小时, 请核实"
        )

    fingerprint_items = (
        [f"missing:{person}" for person in missing_persons]
        + [f"short_hours:{person}" for person in short_hour_persons]
    )

    return {
        "message_text": "\n".join(message_lines),
        "at_mobiles": _unique(list(missing_mobiles or []) + list(short_hour_mobiles or [])),
        "at_dingtalk_ids": _unique(
            list(missing_dingtalk_ids or []) + list(short_hour_dingtalk_ids or [])
        ),
        "fingerprint_items": fingerprint_items,
        "msg_type": "attendance_evening",
    }
