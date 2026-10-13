# -*- coding: utf-8 -*-
"""
iepms_attendance_monitor.py - iEPMS 考勤与测试车辆监控核心引擎
===============================================================
网优现场业务规则：
1. 考勤巡检时间区间：
   - 0:00 - 6:00：凌晨夜测与割接通宵人员，全场景免通报（免上班卡、免下班卡催卡、免工时质检）。
   - 6:00 - 17:00：白天正常上班打卡有效区间。17 点前执行巡检均判定为【上班打卡巡检】。
   - 17:00 - 24:00：下班打卡有效区间。17 点及之后执行巡检判定为【下班打卡与工时质检】。
2. 8.0 小时工时质检：
   - 当天最晚打卡时间 减去 当天最早打卡时间。若不足 8 小时，下班巡检时生成【工时不足】告警。
   - 若打卡满 8 小时但在 17 点前离场，仅提示未打有效下班卡，不误报工时不足。
   - 当日有一条 23:30 前上班卡且在 23:30-23:59 打下班卡时，按正常打卡处理。
3. 网优测试车辆出车与里程合并：
   - 跨地市测试接力用车严格归属于【出发基准地市】，自动核算总里程并提取去重跨市轨迹。
4. 钉钉告警与幂等防重：
   - 缺卡/工时不足实时 @ 人员持续催卡；全员已完成状态当日仅推送一次，避免群内刷屏。
"""

import time
import os
import io
import sys
import json
import re
import gc

import requests
import urllib3
import openpyxl
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

from logger import log as _log
from version import APP_VERSION
import push_idempotent
from dingtalk_delivery import (
    DEFAULT_COOLDOWN_SECONDS,
    GLOBAL_DINGTALK_RATE_LIMITER,
    response_errcode,
    wait_after_rate_limit,
)
from attendance_alerts import compose_evening_alert
from attendance_rules import has_late_night_completion
from plugin_paths import data_root

# ============================================================
# 编码修复: 确保 Windows 终端输出不乱码
# ============================================================
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

if sys.stdout is not None and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ============================================================
# 常量与路径
# ============================================================
SCRIPT_DIR = str(data_root())
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
SESSION_FILE = os.path.join(SCRIPT_DIR, "session_state.json")
ROSTER_FILE = os.path.join(SCRIPT_DIR, "roster.xlsx")
LOCK_FILE = os.path.join(SCRIPT_DIR, "iepms_monitor.lock")
DEBUG_DIR = SCRIPT_DIR
ANALYTICS_SYNC_FILE = os.path.join(SCRIPT_DIR, "management_attendance_sync.json")


def load_config():
    """加载 config.json，失败返回空 dict（各项走默认值）"""
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        _log(f"[警告] config.json 读取失败，使用默认配置: {e}")
        return {}


def safe_print(*args, **kwargs):
    """兼容旧调用：统一走 logger（文件 + 控制台）"""
    _log(" ".join(str(a) for a in args))


def analytics_records_from_project(records, roster_group, today_date):
    """Build non-notifying, local-only daily attendance facts for the plugin DB.

    A day is emitted only when the upstream returned at least one punch for the
    project. That coverage guard is what lets the analytics page distinguish an
    observed missing punch from a day that was never synchronized.
    """
    roster_accounts = set()
    for row in roster_group:
        account = str(row.get("打卡账号", "")).strip().removesuffix(".0")
        if account and account.lower() not in {"none", "nan"}:
            roster_accounts.add(account)
    by_day_account = {}
    observed_days = set()
    for record in records:
        account = str(record.get("账号", record.get("signUserId", ""))).strip().removesuffix(".0")
        raw_time = str(record.get("考勤时间", record.get("raw_time", record.get("signDate", "")))).strip()
        parsed = None
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
            try:
                parsed = datetime.strptime(raw_time[:19], fmt)
                break
            except ValueError:
                pass
        if parsed is None:
            continue
        day = parsed.strftime("%Y-%m-%d")
        observed_days.add(day)
        if account in roster_accounts:
            by_day_account.setdefault((day, account), []).append(parsed)
    result = []
    for day in observed_days:
        for account in roster_accounts:
            moments = sorted(by_day_account.get((day, account), []))
            if not moments:
                result.append({"account": account, "date": day, "clockIn": "", "clockOut": "", "workMinutes": None, "status": "missing"})
                continue
            first, last = moments[0], moments[-1]
            has_pair = last > first
            minutes = round((last - first).total_seconds() / 60) if has_pair else None
            normal = has_pair and (minutes >= 480 or has_late_night_completion(moments))
            result.append({
                "account": account, "date": day, "clockIn": first.strftime("%H:%M"),
                "clockOut": last.strftime("%H:%M") if has_pair else "", "workMinutes": minutes,
                # During the morning pass a single clock-in is an in-progress
                # attendance day, not a missing-card exception yet.
                "status": "normal" if normal else "early" if has_pair else "checked-in" if day == today_date else "missing",
            })
    return result


def save_analytics_sync(records):
    """Atomically replace the current run snapshot consumed by the bridge."""
    by_key = {(str(item.get("account", "")), str(item.get("date", ""))): item for item in records}
    payload = {"capturedAt": datetime.now().isoformat(timespec="seconds"), "records": list(by_key.values())}
    temporary = ANALYTICS_SYNC_FILE + ".tmp"
    try:
        with open(temporary, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=False, separators=(",", ":"))
        os.replace(temporary, ANALYTICS_SYNC_FILE)
    except Exception as exc:
        safe_print(f"[警告] 分析考勤记录保存失败: {exc}")
        try:
            if os.path.exists(temporary):
                os.remove(temporary)
        except Exception:
            pass


# ============================================================
# 单实例锁 & 孤儿进程清理
# ============================================================
def acquire_single_instance():
    """获取全局单实例锁。成功返回文件句柄（需保持打开），失败返回 None。"""
    try:
        import portalocker
        f = open(LOCK_FILE, "w", encoding="utf-8")
        portalocker.lock(f, portalocker.LOCK_EX | portalocker.LOCK_NB)
        f.write(str(os.getpid()))
        f.flush()
        return f
    except Exception:
        return None


def cleanup_orphan_browsers():
    """
    清理上次异常退出遗留的 Playwright 无头浏览器进程。
    只匹配命令行同时含 --headless 和 playwright 特征的进程，
    绝不触碰用户日常使用的 Chrome。
    """
    try:
        import psutil
    except ImportError:
        return
    killed = 0
    for p in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmd = " ".join(p.info.get('cmdline') or []).lower()
            if '--headless' in cmd and 'playwright' in cmd:
                p.kill()
                killed += 1
        except Exception:
            continue
    if killed:
        safe_print(f"[清理] 已清理 {killed} 个遗留的无头浏览器进程")


# ============================================================
# 会话鉴权失效识别
# ============================================================
# 哨兵返回值：区别于 None（业务失败）与 []（无记录），
# 表示"会话失效，重登后可重试"，避免用异常打断分页循环。
class _AuthExpired:
    __slots__ = ()

    def __repr__(self):
        return "<AUTH_EXPIRED>"


AUTH_EXPIRED = _AuthExpired()


# 令牌失效不是业务失败：同一账号被他人登录挤掉（单点登录互踢），
# 或令牌滑动过期，都会让接口返回鉴权错误。这类失败重新登录即可恢复，
# 必须与"无权限/项目已结项"区分开——后者重登多少次都没用。
AUTH_FAIL_MARKERS = (
    "RetCode.AuthFailed",
    "令牌校验失败",
    "令牌已失效",
    "令牌过期",
    "TokenExpired",
    "InvalidToken",
    "NotLogin",
    "未登录",
    "登录超时",
    "UNAUTHORIZED",
)


def eval_api_with_retry(page, js, label, retries=2, backoff_base=3):
    """执行页内 fetch，并在请求层吸收网关瞬时抖动。

    实测（2026-08-20 日志）iEPMS 认证网关会在某一秒内对个别请求直接回
    AuthFailed，而同一会话紧接着的请求仍然成功——令牌其实没失效。这类抖动
    按请求粒度发生，在此就地重试即可，不必上抛到重登路径浪费一次验证码破解。

    仅对 AuthFailed 重试；其他错误（权限不足、超时）原样返回，交由调用方处置。
    重试仍失败则返回最后一次结果，由上层升级为重登。
    """
    result = page.evaluate(js)
    for attempt in range(1, retries + 1):
        if not (isinstance(result, dict) and "error" in result):
            return result
        if not is_auth_failure(result.get("error")):
            return result
        wait = backoff_base * attempt
        safe_print(f"  [抖动] {label} 遭遇 AuthFailed，{wait} 秒后原会话重试 ({attempt}/{retries})...")
        time.sleep(wait)
        result = page.evaluate(js)
        if not (isinstance(result, dict) and "error" in result):
            safe_print(f"  [抖动] {label} 重试成功，令牌仍有效（网关抖动，未重登）")
            return result
    return result


def is_auth_failure(err_text):
    """判断接口错误是否为会话令牌失效（可通过重新登录恢复）"""
    if not err_text:
        return False
    s = str(err_text)
    low = s.lower()
    if any(m.lower() in low for m in AUTH_FAIL_MARKERS):
        return True
    # 服务端错误码 0002 仅在与令牌语义同时出现时才判定，避免误伤其他 0002 场景
    return '"0002"' in s and ("令牌" in s or "auth" in low)


# ============================================================
# 登录
# ============================================================
def run_login(max_retries=3):
    """进程内调用登录模块完成登录+验证码破解，支持重试（登录熔断: 连续失败即放弃）"""
    for attempt in range(1, max_retries + 1):
        safe_print(f"[登录] 第 {attempt}/{max_retries} 次尝试登录...")
        try:
            import iepms_auto_signin
            success = iepms_auto_signin.main()

            if success and os.path.exists(SESSION_FILE):
                safe_print("[登录] 登录成功，会话已保存")
                return True
            safe_print(f"[登录] 第 {attempt} 次登录失败")
        except Exception as e:
            import traceback
            safe_print(f"[登录] 第 {attempt} 次登录异常: {e}\n{traceback.format_exc()}")

        if attempt < max_retries:
            safe_print("[登录] 等待 5 秒后重试...")
            time.sleep(5)
    safe_print("[登录] 所有登录尝试均失败（熔断，不再重试）")
    return False


# ============================================================
# 钉钉推送（带幂等去重）
# ============================================================
def send_dingtalk_alert(webhook_url, message_text, at_mobiles=None, at_dingtalk_ids=None,
                        project_name=None, msg_type=None, fingerprint=None, date_str=None,
                        http_timeout=(5, 20)):
    """
    发送钉钉告警消息。
    若提供 project_name/msg_type/fingerprint/date_str，则先做当日幂等去重：
    同指纹内容当日只推一次，跳过重复推送。
    """
    if not webhook_url or not str(webhook_url).startswith("http"):
        return False

    # 幂等检查
    if project_name and msg_type and date_str:
        fp = fingerprint if fingerprint is not None else "EMPTY"
        if not push_idempotent.should_push(project_name, msg_type, fp, date_str):
            safe_print(f"  [幂等] 相同内容当日已推送，跳过 (类型={msg_type})")
            return True  # 视为成功（业务上无需再推）

    if at_mobiles is None:
        at_mobiles = []
    if at_dingtalk_ids is None:
        at_dingtalk_ids = []

    unique_mobiles = list(dict.fromkeys(m for m in at_mobiles if m and m != 'nan'))
    unique_dingtalk_ids = list(dict.fromkeys(d for d in at_dingtalk_ids if d and d != 'nan'))

    at_str = ""
    for m in unique_mobiles:
        at_str += f" @{m}"
    for d in unique_dingtalk_ids:
        at_str += f" @{d}"

    headers = {'Content-Type': 'application/json'}
    payload = {
        "msgtype": "text",
        "text": {"content": message_text + at_str},
        "at": {"atMobiles": unique_mobiles, "atUserIds": unique_dingtalk_ids, "isAtAll": False}
    }

    # 按 Webhook 节流 + 重试；同群共享时隙，不同群互不等待。
    for retry in range(3):
        try:
            GLOBAL_DINGTALK_RATE_LIMITER.wait_for_slot(webhook_url)
            res = requests.post(webhook_url, json=payload, headers=headers, timeout=http_timeout)
            if res.status_code == 200:
                try:
                    resp_json = res.json()
                except (TypeError, ValueError):
                    safe_print(f"  [钉钉] 推送响应不是有效 JSON: {res.text[:200]}")
                    return False
                if response_errcode(resp_json) == 0:
                    safe_print(f"  [钉钉] 消息已推送")
                    if project_name and msg_type and date_str:
                        push_idempotent.mark_pushed(project_name, msg_type,
                                                    fingerprint if fingerprint is not None else "EMPTY",
                                                    date_str)
                    return True
                if response_errcode(resp_json) == 660026:
                    if retry < 2:
                        safe_print(
                            f"  [钉钉] 触发 660026 频率限制，等待 {int(DEFAULT_COOLDOWN_SECONDS)} 秒后重试..."
                        )
                        wait_after_rate_limit(resp_json, sleep_func=time.sleep)
                        continue
                    safe_print("  [钉钉] 660026 频率限制，已达到重试上限")
                    return False
                safe_print(f"  [钉钉] 推送被拒绝: {resp_json}")
                return False
            safe_print(f"  [钉钉] 推送失败 HTTP {res.status_code}: {res.text[:200]}")
        except Exception as e:
            safe_print(f"  [钉钉] 推送异常(第{retry + 1}次): {e}")
        if retry < 2:
            time.sleep(2 * (retry + 1))
    return False


def report_project_system_issue(webhook_url, project_name, issue_code, reason,
                                check_mode, today_date):
    """报告项目级数据/配置异常，不包含任何人员名单或考勤结论。"""
    mode_label = "上班巡检" if check_mode == "morning" else "下班巡检"
    message_text = (
        f"[系统异常] {project_name}：{mode_label}{reason}，"
        "本次不生成考勤完成或人员缺卡结论，请人工核查。"
    )
    safe_print(f"  [异常] {message_text}")
    return send_dingtalk_alert(
        webhook_url,
        message_text,
        [],
        [],
        project_name=project_name,
        msg_type=f"system_{issue_code}_{check_mode}",
        fingerprint=push_idempotent.make_fingerprint([issue_code, reason]),
        date_str=today_date,
    )


# ============================================================
# 考勤巡检逻辑
# ============================================================
def check_attendance(records, roster_group, project_name, project_webhook, check_mode, today_date):
    """
    根据考勤记录和花名册，执行缺卡检测并推送告警。

    records: list[dict] - 从 API 获取的考勤记录
    roster_group: DataFrame - 当前项目的花名册
    check_mode: "morning" | "evening"

    【业务规则确认 2026-07-28】
    - 12:00-13:00 午间打卡计为有效卡（可能只是下车打卡，经确认按有效上/下班卡处理）。
    - 凌晨 0:00-5:00 打卡视为通宵加班，下班卡免检。
    - 跨零点加班工时、全天单卡人员工时暂不统计（已知限制，见 README）。
    """
    mode_label = "上班卡" if check_mode == "morning" else "下班卡"

    # 标准化考勤记录
    today_records = []
    for rec in records:
        acc = str(rec.get("账号", rec.get("signUserId", ""))).strip()
        t = str(rec.get("考勤时间", rec.get("signDate", ""))).strip()
        if acc.endswith('.0'):
            acc = acc[:-2]
        if t and today_date in t:
            try:
                hour = int(t.split(' ')[1].split(':')[0])
            except (IndexError, ValueError):
                hour = -1
            today_records.append({"acc": acc, "hour": hour, "raw_time": t})

    # 构建花名册
    seen_accounts = set()
    roster_list = []
    for row in roster_group:
        emp_account = str(row.get('打卡账号', '')).strip()
        if emp_account.endswith('.0'):
            emp_account = emp_account[:-2]
        emp_name = str(row.get('姓名', '')).strip()
        mobile = str(row.get('手机号', '')).strip()
        if mobile == 'None' or mobile == 'nan':
            mobile = ''
        dd_id = str(row.get('钉钉号', row.get('钉钉ID', ''))).strip()
        if dd_id == 'None' or dd_id == 'nan':
            dd_id = ''

        if not emp_account or emp_account.lower() in {"none", "nan"}:
            continue
        if emp_account in seen_accounts:
            continue
        seen_accounts.add(emp_account)
        city = str(row.get('地市', row.get('区域', ''))).strip().replace('地市', '').replace('市', '')
        roster_list.append({"acc": emp_account, "name": emp_name, "mobile": mobile, "dd_id": dd_id, "city": city})

    # 安全边界：空花名册和当日无考勤数据均不得进入人员结论分支。
    if not roster_list:
        reason = "花名册中没有有效打卡账号（配置异常）"
        report_project_system_issue(
            project_webhook, project_name, "config_error", reason,
            check_mode, today_date,
        )
        return {"status": "config_error", "reason": reason, "roster_count": 0,
                "record_count": len(today_records)}

    if not today_records:
        reason = "接口未返回当日有效考勤记录（数据状态不明）"
        report_project_system_issue(
            project_webhook, project_name, "no_data", reason,
            check_mode, today_date,
        )
        return {"status": "no_data", "reason": reason,
                "roster_count": len(roster_list), "record_count": 0}

    cfg = load_config()
    exempt_attendance = bool(cfg.get("overnight_exempt_attendance", True))
    check_work_hours = bool(cfg.get("overnight_check_work_hours", False))

    if check_mode == "morning":
        # ====== 上班卡模式 ======
        # 区分凌晨打卡人员 (0:00-6:00) 和正常上班打卡 (6:00-17:00)
        overnight_workers = set()
        morning_signed = set()
        for rec in today_records:
            if rec["hour"] < 6:
                overnight_workers.add(rec["acc"])
            elif rec["hour"] < 17:
                morning_signed.add(rec["acc"])

        roster_accs = set(emp["acc"] for emp in roster_list)
        # 根据配置决定凌晨打卡人员是否免除白天上班卡巡检
        if exempt_attendance:
            overnight_roster = overnight_workers & roster_accs
        else:
            overnight_roster = set()

        missing_persons = []
        missing_mobiles = []
        missing_dd_ids = []
        for emp in roster_list:
            # 凌晨打卡人员若开启免检，则不参与上班打卡检查
            if emp["acc"] in overnight_roster:
                continue
            if emp["acc"] not in morning_signed:
                missing_persons.append(f"{emp['name']}({emp['acc']})")
                if emp["mobile"]:
                    missing_mobiles.append(emp["mobile"])
                if emp["dd_id"]:
                    missing_dd_ids.append(emp["dd_id"])

        # 应打卡人数 = 总人数 - 本项目凌晨打卡免检人数
        total_expected = max(len(roster_list) - len(overnight_roster), 0)
        total_actual = max(total_expected - len(missing_persons), 0)

        if len(overnight_roster) > 0:
            safe_print(f"  [信息] 凌晨加班免检上班卡: {len(overnight_roster)}人")

        if len(missing_persons) == 0:
            alert_msg = f"[上班卡] {project_name}, 应打卡{total_expected}人, 实际打卡{total_actual}人, 已全部完成打卡"
            safe_print(f"  [结果] {alert_msg}")
            send_dingtalk_alert(project_webhook, alert_msg, [], [],
                                project_name=project_name, msg_type="alldone_morning",
                                fingerprint="EMPTY", date_str=today_date)
        else:
            missing_str = ", ".join(missing_persons)
            alert_msg = f"[上班卡] {project_name}, 应打卡{total_expected}人, 实际打卡{total_actual}人, {missing_str}未打卡"
            safe_print(f"  [结果] {alert_msg}")
            send_dingtalk_alert(project_webhook, alert_msg, missing_mobiles, missing_dd_ids,
                                project_name=project_name, msg_type="missing_morning",
                                fingerprint=push_idempotent.make_fingerprint(missing_persons),
                                date_str=today_date)

    else:
        # ====== 下班卡模式 ======
        # 0:00-6:00: 凌晨加班通宵人员
        # 6:00-17:00: 正常上班/出勤打卡人员
        # 17:00-24:00: 有效下班卡打卡区间
        overnight_workers = set()
        morning_workers = set()
        evening_signed = set()

        for rec in today_records:
            if rec["hour"] < 6:
                overnight_workers.add(rec["acc"])
            elif rec["hour"] < 17:
                morning_workers.add(rec["acc"])
            else:
                # 17:00 - 24:00 为有效下班打卡
                evening_signed.add(rec["acc"])

        roster_accs = set(emp["acc"] for emp in roster_list)
        overnight_roster = overnight_workers & roster_accs
        morning_roster = morning_workers & roster_accs

        if exempt_attendance:
            need_clockout = morning_roster - overnight_roster
            exempt_count = len(overnight_roster)
        else:
            # 不免检时：今天出勤过（含凌晨或白班）的人员均需打有效下班卡
            need_clockout = (morning_roster | overnight_roster)
            exempt_count = 0

        missing_persons = []
        missing_mobiles = []
        missing_dd_ids = []
        for emp in roster_list:
            if emp["acc"] in need_clockout and emp["acc"] not in evening_signed:
                missing_persons.append(f"{emp['name']}({emp['acc']})")
                if emp["mobile"]:
                    missing_mobiles.append(emp["mobile"])
                if emp["dd_id"]:
                    missing_dd_ids.append(emp["dd_id"])

        total_need = len(need_clockout)
        total_done = total_need - len(missing_persons)

        if exempt_count > 0:
            safe_print(f"  [信息] 凌晨加班免检: {exempt_count}人")

        if total_need == 0:
            safe_print(f"  [信息] [下班卡] {project_name}, 今日无白班出勤记录或接口无数据，暂不判定下班打卡")
        elif len(missing_persons) == 0:
            alert_msg = f"[下班卡] {project_name}, 需打下班卡{total_need}人, 实际打卡{total_done}人, 已全部完成打卡"
            safe_print(f"  [结果] {alert_msg}")
        else:
            missing_str = ", ".join(missing_persons)
            alert_msg = f"[下班卡] {project_name}, 需打下班卡{total_need}人, 实际打卡{total_done}人, {missing_str}未打下班卡"
            safe_print(f"  [结果] {alert_msg}")

        # ====== 工时质检 (当天最晚打卡时间 - 当天最早打卡时间 < 8小时) ======
        short_hour_persons = []
        short_hour_mobiles = []
        short_hour_dd_ids = []
        for emp in roster_list:
            acc = emp["acc"]
            is_overnight = acc in overnight_workers

            # 若为凌晨打卡人员且未开启凌晨工时检测，则跳过
            if is_overnight and not check_work_hours:
                continue

            user_times = []
            for rec in today_records:
                if rec["acc"] == acc and rec.get("raw_time"):
                    try:
                        dt_obj = datetime.strptime(rec["raw_time"], "%Y-%m-%d %H:%M:%S")
                        user_times.append(dt_obj)
                    except ValueError:
                        pass

            if len(user_times) >= 2:
                earliest_time = min(user_times)
                latest_time = max(user_times)
                duration_hours = (latest_time - earliest_time).total_seconds() / 3600.0
                if duration_hours < 8.0 and not has_late_night_completion(user_times):
                    short_hour_persons.append(f"{emp['name']}({acc})")
                    if emp["mobile"]:
                        short_hour_mobiles.append(emp["mobile"])
                    if emp["dd_id"]:
                        short_hour_dd_ids.append(emp["dd_id"])
            elif len(user_times) == 1 and is_overnight and check_work_hours:
                # 凌晨打卡且开启工时质检的单卡场景：跨度为 0 小时，触发工时不足告警
                short_hour_persons.append(f"{emp['name']}({acc})")
                if emp["mobile"]:
                    short_hour_mobiles.append(emp["mobile"])
                if emp["dd_id"]:
                    short_hour_dd_ids.append(emp["dd_id"])

        if short_hour_persons:
            short_str = ", ".join(short_hour_persons)
            short_msg = f"[工时不足] {project_name}, {short_str}打卡时间不足8小时, 请核实"
            safe_print(f"  [结果] {short_msg}")

        # 同一项目的下班缺卡和工时不足合并成一条消息，统一去重 @ 人员。
        if total_need > 0 or short_hour_persons:
            evening_alert = compose_evening_alert(
                project_name=project_name,
                total_need=total_need,
                total_done=total_done,
                missing_persons=missing_persons,
                missing_mobiles=missing_mobiles,
                missing_dingtalk_ids=missing_dd_ids,
                short_hour_persons=short_hour_persons,
                short_hour_mobiles=short_hour_mobiles,
                short_hour_dingtalk_ids=short_hour_dd_ids,
            )
            if evening_alert.get("message_text"):
                send_dingtalk_alert(
                    project_webhook,
                    evening_alert["message_text"],
                    evening_alert["at_mobiles"],
                    evening_alert["at_dingtalk_ids"],
                    project_name=project_name,
                    msg_type=evening_alert["msg_type"],
                    fingerprint=push_idempotent.make_fingerprint(evening_alert["fingerprint_items"]),
                    date_str=today_date,
                )

    # ====== 车辆里程独立统计 ======
    check_and_output_vehicle_mileage(records, roster_group, project_name, project_webhook, today_date, check_mode)

    # ====== 自动持久化结构化考勤与车辆明细（供 GUI 一键导出 Excel） ======
    try:
        import export_manager as em
        morning_rows = [em.build_morning_row(emp, today_records, project_name, today_date) for emp in roster_list]
        evening_rows = [em.build_evening_row(emp, today_records, project_name, today_date) for emp in roster_list]
        vehicle_rows = em.extract_vehicle_rows(records, roster_group, project_name, today_date)
        em.update_and_save_last_data(morning_rows, evening_rows, vehicle_rows, today_date)
    except Exception:
        pass

    return {"status": "success", "reason": "",
            "roster_count": len(roster_list), "record_count": len(today_records)}


def _to_float(v):
    """里程字段容错转数值（API 可能返回字符串、带单位或空值）"""
    if isinstance(v, (int, float)):
        return float(v)
    try:
        s = str(v).strip().replace("km", "").replace("KM", "").replace(",", "")
        return float(s) if s else 0.0
    except (TypeError, ValueError):
        return 0.0


def _mileage_sort_key(rec):
    """打卡记录时序排序键：优先解析 raw_time，失败时按字符串兜底"""
    t = str(rec.get("raw_time", "") or "").strip().replace("/", "-")
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(t, fmt).strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
    return t


def check_and_output_vehicle_mileage(records, roster_group, project_name, project_webhook, today_date, check_mode):
    """独立车辆里程统计与输出逻辑（按 roster.xlsx 中的地市关联）

    跨地市用车按车牌号全局合并：以当日首次打卡地市为基准地市归属，
    里程取末次打卡里程减首次出发前里程，避免 A/B 市重复统计与里程归零。
    """
    cfg = load_config()
    # 调试开关收敛至 config.json 的 debug_car_mode
    DEBUG_CAR_MODE = bool(cfg.get("debug_car_mode", False))

    if DEBUG_CAR_MODE:
        d_yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        target_dates = [d_yesterday]
        should_run = True
        safe_print(f"  [调试车辆模式] 使用昨天({d_yesterday})的车辆数据进行统计")
    else:
        target_dates = [today_date]
        should_run = (check_mode == "evening" or datetime.now().hour >= 17)

    if not should_run:
        return

    # 1. 建立账号到地市与中文姓名的硬映射（100% 来自 roster.xlsx）
    account_to_city = {}
    account_to_cn_name = {}
    for row in roster_group:
        acc = str(row.get('打卡账号', '')).strip()
        if acc.endswith('.0'):
            acc = acc[:-2]
        cn_name = str(row.get('姓名', '')).strip()
        city = str(row.get('地市', row.get('区域', ''))).strip()

        if acc:
            if cn_name and cn_name != 'nan':
                account_to_cn_name[acc] = cn_name
            if city and city != 'nan':
                clean_city = city.replace("地市", "").replace("市", "").replace("区域", "").strip()
                account_to_city[acc] = clean_city

    # 尝试筛选有车辆行程信息的记录 (兼容 - 和 / 两种日期分隔符)
    vehicle_records = []
    for dt in target_dates:
        dt_dash = dt.replace("/", "-")
        dt_slash = dt.replace("-", "/")

        matched_recs = [
            rec for rec in records
            if rec.get("raw_time") and (dt_dash in rec.get("raw_time") or dt_slash in rec.get("raw_time")) and (
                rec.get("plate_no") or rec.get("mileage", 0) > 0 or rec.get("car_scene")
            )
        ]
        if matched_recs:
            vehicle_records = matched_recs
            break

    if not vehicle_records:
        return

    # 2. 按车牌号全局分组（跨地市合并，避免同一辆车在 A/B 市各统计一次）
    #    车牌缺失时无法判定是否同一辆车，退回按 (地市, 账号) 分组，不参与跨市合并
    car_groups = {}
    for rec in vehicle_records:
        acc = str(rec.get("账号") or rec.get("signUserId") or "").strip()
        if acc.endswith('.0'):
            acc = acc[:-2]

        city = account_to_city.get(acc, "未知地市")
        cn_name = account_to_cn_name.get(acc, rec.get("姓名") or "员工")
        plate = str(rec.get("plate_no") or "").strip()

        if plate:
            key = ("PLATE", plate)
        else:
            plate = "未登记车牌"
            key = ("NOPLATE", city, acc)

        if key not in car_groups:
            car_groups[key] = {"records": [], "plate": plate}
        car_groups[key]["records"].append({
            "rec": rec, "city": city, "driver": cn_name,
            "sort_key": _mileage_sort_key(rec),
        })

    # 3. 按车牌计算：基准地市 = 首次打卡地市；里程 = 末次打卡里程 - 首次出发前里程
    area_stats = {}

    for key, item in car_groups.items():
        entries = sorted(item["records"], key=lambda e: e["sort_key"])
        plate = item["plate"]

        # 基准地市与司机取自该车牌当日第一次打卡
        base_city = entries[0]["city"]
        driver_name = entries[0]["driver"]
        via_cities = [e["city"] for e in entries if e["city"] != base_city]

        # 里程锚点：优先以“开始用车”为起点、“结束/还车”为终点；
        # 缺失场景标记时退回首末两次有效里程读数
        valid = [e for e in entries if _to_float(e["rec"].get("mileage", 0.0)) > 0]
        car_km = 0.0
        if len(valid) >= 2:
            starts = [e for e in valid if "开始" in str(e["rec"].get("car_scene", ""))]
            ends = [e for e in valid if "结束" in str(e["rec"].get("car_scene", ""))
                    or "还车" in str(e["rec"].get("car_scene", ""))]

            first = starts[0] if starts else valid[0]
            last = ends[-1] if ends else valid[-1]

            start_km = _to_float(first["rec"].get("mileage", 0.0))
            end_km = _to_float(last["rec"].get("mileage", 0.0))
            # 起点须早于终点，否则用全组极值兜底（防止场景标记错乱导致负值）
            if end_km < start_km:
                start_km = min(_to_float(e["rec"].get("mileage", 0.0)) for e in valid)
                end_km = max(_to_float(e["rec"].get("mileage", 0.0)) for e in valid)
            diff_km = end_km - start_km
            car_km = diff_km if 0 <= diff_km < 2000 else 0.0

            if starts:
                base_city = starts[0]["city"]
                driver_name = starts[0]["driver"]
                via_cities = [e["city"] for e in entries if e["city"] != base_city]

        # 去重保序，仅用于跨市提示
        seen = set()
        via_uniq = [c for c in via_cities if not (c in seen or seen.add(c))]

        if base_city not in area_stats:
            area_stats[base_city] = []
        area_stats[base_city].append({
            "plate": plate, "driver": driver_name,
            "km": car_km, "via": via_uniq,
        })

    # 4. 按地市输出格式化结果（每项目每地市每日仅推一次）
    for city, cars_list in area_stats.items():
        if not cars_list:
            continue

        car_count = len(cars_list)
        total_km = sum(item["km"] for item in cars_list)

        details = []
        for item in cars_list:
            p_no = item["plate"]
            d_name = item["driver"]
            km = item["km"]
            km_str = f"{km:.1f}".rstrip('0').rstrip('.') if km % 1 != 0 else f"{int(km)}"
            seg = f"'{d_name}'_‘{p_no}’里程{km_str}KM"
            if item.get("via"):
                seg += f"（跨市：{'、'.join(item['via'])}）"
            details.append(seg)

        detail_str = "，".join(details)
        total_km_str = f"{total_km:.1f}".rstrip('0').rstrip('.') if total_km % 1 != 0 else f"{int(total_km)}"

        vehicle_msg = f"[车辆里程] {city}地市今日出车{car_count}辆，共计里程{total_km_str}km，其中{detail_str}。"
        safe_print(f"  [结果] {vehicle_msg}")
        send_dingtalk_alert(project_webhook, vehicle_msg, [], [],
                            project_name=project_name, msg_type=f"vehicle_{city}",
                            fingerprint="EMPTY", date_str=today_date)


# ============================================================
# API 数据抓取
# ============================================================
def fetch_attendance_api(page, project_name, start_date, today_date, cfg, project_code=None):
    """通过纯 API 方式获取指定项目的考勤记录（秒级完成，带接口超时与分页兜底）

    Args:
        page: Playwright page 对象
        project_name: 项目名称（用于输出显示）
        start_date: 开始日期
        today_date: 结束日期
        cfg: 配置对象
        project_code: 项目号（优先使用项目号查询，避免项目名称重复问题）
    """
    cfg_t = cfg.get("timeouts", {}) if isinstance(cfg.get("timeouts"), dict) else {}
    api_fetch_ms = int(cfg_t.get("api_fetch_ms", 30000))
    page_size = int(cfg.get("page_size", 2000))
    tenant_id = str(cfg.get("tenant_id", "10001"))
    iepms_host = str(cfg.get("iepms_host", "https://iepms.zte.com.cn")).rstrip("/")
    debug_dump = bool(cfg.get("debug_dump_api", False))
    # 网关抖动就地重试参数：实测抖动窗口约 2 秒，3 秒首退避足以覆盖
    transient_retry = int(cfg_t.get("transient_auth_retry", 2))
    transient_backoff = int(cfg_t.get("transient_auth_backoff_s", 3))

    safe_print(f"  [API] 搜索项目: {project_name}" + (f" (项目号: {project_code})" if project_code else ""))

    project_id = None
    search_keyword = ""

    # 策略：优先使用项目号查询（更准确，避免重名），项目号为空时才使用项目名称
    if project_code:
        # 1. 优先使用项目号查询
        search_keyword = project_code
        safe_print(f"  [API] 使用项目号查询: {project_code}")
        search_body_json = json.dumps({
            "pageNo": 1, "pageSize": 50, "projectDataType": "Y", "searchKeyWord": str(project_code)
        })
        js_search = f"""
        async () => {{
            try {{
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), {api_fetch_ms});
                const res = await fetch("{iepms_host}/zte-crm-iepms-basebff/zte-crm-iepms-bcenter/projectinfoext/getpage", {{
                    method: "POST",
                    headers: {{ "Content-Type": "application/json", "tenantId": "{tenant_id}" }},
                    body: JSON.stringify({search_body_json}),
                    signal: ctrl.signal
                }});
                clearTimeout(timer);
                const data = await res.json();
                if (!data || !data.bo || !data.bo.rows) return {{"error": JSON.stringify(data)}};
                return data.bo.rows;
            }} catch(e) {{ return {{"error": e.message}}; }}
        }}
        """
        rows = eval_api_with_retry(page, js_search, "项目号查询",
                                   retries=transient_retry, backoff_base=transient_backoff)
        if isinstance(rows, dict) and "error" in rows:
            if is_auth_failure(rows['error']):
                safe_print(f"  [会话] 项目号查询重试后仍失败，判定令牌失效，需重新登录")
                return AUTH_EXPIRED
            safe_print(f"  [错误] 项目号查询异常: {rows['error'][:100]}")
            return None
        elif rows:
            # 第一轮：优先精确匹配项目号
            for row in rows:
                row_code = str(row.get('projCode') or row.get('projectCode') or row.get('projNo') or row.get('projectNo') or '').strip()
                if row_code == project_code:
                    project_id = row.get('projId') or row.get('id')
                    safe_print(f"  [API] 通过项目号精确匹配到项目ID: {project_id}")
                    break
            # 第二轮：若精确匹配未命中，再进行子串/名称兜底匹配
            if not project_id:
                for row in rows:
                    row_code = str(row.get('projCode') or row.get('projectCode') or row.get('projNo') or row.get('projectNo') or '').strip()
                    if project_code in row_code or project_code in str(row.get('projName', '')) or project_code in str(row.get('projectName', '')):
                        project_id = row.get('projId') or row.get('id')
                        safe_print(f"  [API] 通过项目号模糊匹配到项目ID: {project_id}")
                        break

    # 2. 如果项目号为空或查询失败，使用项目名称作为fallback
    if not project_id:
        if project_code:
            safe_print(f"  [API] 项目号查询未找到，fallback 到项目名称查询: {project_name}")
        else:
            safe_print(f"  [API] 未提供项目号，使用项目名称查询: {project_name}")

        search_keyword = project_name
        name_body_json = json.dumps({
            "pageNo": 1, "pageSize": 50, "projectDataType": "Y", "searchKeyWord": str(project_name)
        })
        js_search = f"""
        async () => {{
            try {{
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), {api_fetch_ms});
                const res = await fetch("{iepms_host}/zte-crm-iepms-basebff/zte-crm-iepms-bcenter/projectinfoext/getpage", {{
                    method: "POST",
                    headers: {{ "Content-Type": "application/json", "tenantId": "{tenant_id}" }},
                    body: JSON.stringify({name_body_json}),
                    signal: ctrl.signal
                }});
                clearTimeout(timer);
                const data = await res.json();
                if (!data || !data.bo || !data.bo.rows) return {{"error": JSON.stringify(data)}};
                return data.bo.rows;
            }} catch(e) {{ return {{"error": e.message}}; }}
        }}
        """
        rows = eval_api_with_retry(page, js_search, "项目名称查询",
                                   retries=transient_retry, backoff_base=transient_backoff)
        if isinstance(rows, dict) and "error" in rows:
            if is_auth_failure(rows['error']):
                safe_print(f"  [会话] 项目名称查询重试后仍失败，判定令牌失效，需重新登录")
                return AUTH_EXPIRED
            safe_print(f"  [错误] 项目名称查询异常: {rows['error'][:100]}")
            return None
        elif rows:
            for row in rows:
                if project_name in row.get('projName', '') or project_name in row.get('projectName', ''):
                    project_id = row.get('projId') or row.get('id')
                    safe_print(f"  [API] 通过项目名称找到项目ID: {project_id}")
                    break

    if not project_id:
        safe_print(f"  [错误] 未找到项目 ID（已尝试" + (f"项目号 {project_code} 和" if project_code else "") + f"项目名称 {project_name}）")
        return None

    safe_print(f"  [API] 找到项目ID: {project_id}，开始拉取考勤数据...")
    t_start = time.time()

    # 2. 分页拉取考勤数据（返回满页时继续拉下一页，兜底截断）
    all_rows = []
    page_num = 1
    while True:
        fetch_payload_json = json.dumps({
            "signUserIds": [], "signType": 0,
            "startDate": f"{start_date} 00:00:00", "endDate": f"{today_date} 23:59:59",
            "submitStartDate": "", "submitEndDate": "",
            "emailType": 0, "faceType": -1, "accountType": "-1", "siteIds": [],
            "signStatus": -1, "approveStatus": -1,
            "pageNum": page_num, "pageSize": page_size,
            "projectId": str(project_id), "carUsage": -1, "isInterProject": False
        })
        js_fetch = f"""
        async () => {{
            try {{
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), {api_fetch_ms});
                const res = await fetch("{iepms_host}/zte-crm-iepms-basebff/zte-iccp-iepms-attendance/web/sign/listMyCompanySignHistory", {{
                    method: "POST",
                    headers: {{ "Content-Type": "application/json", "tenantId": "{tenant_id}" }},
                    body: JSON.stringify({fetch_payload_json}),
                    signal: ctrl.signal
                }});
                clearTimeout(timer);
                const data = await res.json();
                if (!data || !data.bo || !data.bo.rows) return {{"error": JSON.stringify(data)}};
                return data.bo.rows;
            }} catch (e) {{ return {{"error": e.message}}; }}
        }}
        """
        att_rows = eval_api_with_retry(page, js_fetch, f"考勤拉取(第{page_num}页)",
                                       retries=transient_retry, backoff_base=transient_backoff)
        if isinstance(att_rows, dict) and "error" in att_rows:
            err_str = att_rows['error']
            # 令牌失效优先判定：翻页途中被挤掉也要重登重拉，
            # 否则会把半截数据当成完整结果，误报缺卡。
            if is_auth_failure(err_str):
                safe_print(f"  [会话] 考勤拉取重试后仍失败（第 {page_num} 页），判定令牌失效，需重新登录")
                return AUTH_EXPIRED
            if page_num == 1:
                if "PermissionDenied" in err_str or "do not have the right" in err_str:
                    safe_print(f"  [权限不足] ❌ 您的账号当前对该项目已无查看权限！(项目可能已结项，建议在 roster.xlsx 中删除该项目)")
                else:
                    safe_print(f"  [错误] 考勤拉取异常: {err_str[:120]}")
                return None
            else:
                safe_print(f"  [警告] ❌ 第 {page_num} 页拉取失败，本轮考勤数据不完整，中止本轮判定以防误报缺卡！")
                return None

        if not att_rows:
            break

        all_rows.extend(att_rows)
        if len(att_rows) < page_size or page_num >= 20:
            break
        page_num += 1
        safe_print(f"  [API] 翻页拉取第 {page_num} 页...")

    elapsed = time.time() - t_start
    safe_print(f"  [API] 成功拉取到 {len(all_rows)} 条记录 (耗时: {elapsed:.2f}s)")

    # 调试保存原始记录 JSON（仅 config 开启 debug_dump_api 时）
    if debug_dump:
        try:
            debug_json_path = os.path.join(SCRIPT_DIR, "api_debug_rows.json")
            with open(debug_json_path, "w", encoding="utf-8") as f_dump:
                json.dump(all_rows, f_dump, ensure_ascii=False, indent=2)
            safe_print(f"  [调优] 已导出原始考勤数据 JSON")
        except Exception:
            pass

    records = []
    for r in all_rows:
        area_str, car_scene, plate_no, mileage_val = smart_extract_car_fields(r, project_name)
        rec = {
            "姓名": r.get("signUserName", ""),
            "账号": r.get("signUserId", ""),
            "考勤时间": r.get("signDate", ""),
            "raw_time": r.get("signDate", ""),
            "hour": int(r.get("signDate", " 00:").split(" ")[1].split(":")[0]) if r.get("signDate") else 0,
            "area": area_str,
            "car_scene": car_scene,
            "plate_no": plate_no,
            "mileage": mileage_val,
        }
        # 原始记录仅调试模式保留，避免大数据对象常驻内存
        if debug_dump:
            rec["raw_record"] = r
        records.append(rec)

    # 大对象即用完即弃
    del all_rows
    return records


def recover_session_and_retry(browser, context, page, project_name, start_date,
                              today_date, cfg, project_code, main_url,
                              page_load_ms, element_wait_ms, max_recover=2,
                              transient_retry=2):
    """遭遇令牌校验失败后分级自愈，然后重试该项目。

    AuthFailed 有两种成因，代价差异很大，因此分两级处理：

    第一级（同会话轻量重试）：网关瞬时抖动。特征是请求在同一秒内被拒，
    而前后相邻项目用同一会话都能正常拉取——令牌其实没死，重登纯属浪费。
    这类占多数，先原地退避重试，成本几秒。

    第二级（重登并重建上下文）：令牌真失效，即单点登录互踢或滑动过期。
    此时同会话重试必然全部失败。重新登录只写入新的 session 文件，
    旧 context 仍持有失效令牌，因此必须连同 context 一起重建。

    Returns:
        (page, context, records)：records 为记录列表、None（业务失败）
        或 AUTH_EXPIRED（两级均耗尽仍失效）
    """
    # ---- 第一级：同会话轻量重试，不动登录态 ----
    for attempt in range(1, transient_retry + 1):
        backoff = 3 * attempt
        safe_print(f"  [会话] 疑似网关瞬时拒绝，{backoff} 秒后同会话重试 ({attempt}/{transient_retry})...")
        time.sleep(backoff)
        records = fetch_attendance_api(
            page, project_name, start_date, today_date, cfg, project_code
        )
        if records is not AUTH_EXPIRED:
            if records is not None:
                safe_print("  [会话] 同会话重试成功，令牌仍有效（属网关抖动，无需重登）")
            return page, context, records

    safe_print("  [会话] 同会话重试均失败，判定令牌确已失效，升级为重新登录")

    # ---- 第二级：重登 + 重建上下文 ----
    records = AUTH_EXPIRED
    for attempt in range(1, max_recover + 1):
        safe_print(f"  [会话] 第 {attempt}/{max_recover} 次会话自愈：重新登录并重建上下文...")

        if not run_login():
            safe_print("  [会话] 重新登录失败，放弃自愈")
            return page, context, None

        # 重建 context：新 session 文件必须通过新的 storage_state 生效
        try:
            try:
                page.close()
                context.close()
            except Exception:
                pass
            context = browser.new_context(
                storage_state=SESSION_FILE,
                viewport={'width': 1280, 'height': 800}
            )
            context.set_default_timeout(element_wait_ms)
            page = context.new_page()
            page.goto(main_url, wait_until="load", timeout=page_load_ms)
        except Exception as e:
            safe_print(f"  [会话] 重建浏览器上下文失败: {e}")
            return page, context, None

        safe_print("  [会话] 上下文已重建，重试拉取考勤数据")
        records = fetch_attendance_api(
            page, project_name, start_date, today_date, cfg, project_code
        )
        if records is not AUTH_EXPIRED:
            if records is not None:
                safe_print("  [会话] 自愈成功，数据已正常拉取")
            return page, context, records

        # 再次失效说明大概率仍被他人挤占，退避后重试
        if attempt < max_recover:
            backoff = 10 * attempt
            safe_print(f"  [会话] 仍为令牌失效（可能账号正被他人占用），等待 {backoff} 秒后重试...")
            time.sleep(backoff)

    safe_print("  [会话] 已达自愈上限，该项目本轮跳过")
    return page, context, records


def smart_extract_car_fields(r, project_name):
    """智能通用车卡字段提取器（模糊适配各种API变体键名）"""
    # 1. 搜寻车牌号
    plate_no = ""
    for k, v in r.items():
        if not v:
            continue
        k_lower = str(k).lower()
        if any(x in k_lower for x in ["plate", "carno", "vehicleno", "carnumber", "license", "car_no", "car_plate"]):
            plate_no = str(v).strip()
            break
    if not plate_no:
        plate_no = (r.get("carNo") or r.get("plateNo") or r.get("licensePlate") or
                    r.get("carPlate") or r.get("carNumber") or r.get("vehicleNo") or "")

    # 2. 搜寻用车场景
    car_scene = ""
    for k, v in r.items():
        if not v:
            continue
        k_lower = str(k).lower()
        if any(x in k_lower for x in ["usage", "scene", "caruse", "use_car"]):
            car_scene = str(v).strip()
            break
    if not car_scene:
        car_scene = (r.get("carUsageName") or r.get("carUsage") or r.get("carScene") or
                     r.get("useCarScene") or r.get("carUse") or "")

    # 3. 搜寻里程数
    mileage_val = 0.0
    for k, v in r.items():
        if v is None or v == "":
            continue
        k_lower = str(k).lower()
        if any(x in k_lower for x in ["mile", "odometer", "km"]):
            try:
                val = float(v)
                if val > 0:
                    mileage_val = val
                    break
            except (ValueError, TypeError):
                pass
    if mileage_val == 0.0:
        raw_m = (r.get("mileage") or r.get("mileageValue") or r.get("odometer") or
                 r.get("endMileage") or r.get("km") or 0)
        try:
            mileage_val = float(raw_m) if raw_m else 0.0
        except (ValueError, TypeError):
            mileage_val = 0.0

    # 4. 搜寻区域
    raw_area = (r.get("areaName") or r.get("regionName") or r.get("area") or
                r.get("siteName") or r.get("projectName") or project_name or "")
    area_str = str(raw_area).replace("打卡站点-", "").replace("打卡站点", "").replace("区域", "").replace("市", "").strip()
    if not area_str:
        area_str = project_name

    return area_str, car_scene, plate_no, mileage_val


# ============================================================
# 看门狗心跳标记
# ============================================================
def write_heartbeat_ok(date_str, check_mode):
    """主流程成功结束后记录心跳状态到统一文件，供 session_keeper 看门狗检查"""
    try:
        push_idempotent.write_heartbeat(date_str, check_mode)
    except Exception:
        pass


# ============================================================
# 主流程
# ============================================================
def main():
    # 自动清理历史遗留的旧散落状态文件
    push_idempotent.cleanup_legacy_state_files()

    run_start = time.time()

    safe_print("=" * 60)
    safe_print(f"  iEPMS 考勤自动监控系统 {APP_VERSION}")
    safe_print(f"  运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    safe_print("=" * 60)

    cfg = load_config()
    cfg_t = cfg.get("timeouts", {}) if isinstance(cfg.get("timeouts"), dict) else {}
    page_load_ms = int(cfg_t.get("page_load_ms", 60000))
    element_wait_ms = int(cfg_t.get("element_wait_ms", 30000))
    run_budget_sec = int(cfg_t.get("run_budget_minutes", 25)) * 60

    iepms_host = str(cfg.get("iepms_host", "https://iepms.zte.com.cn")).rstrip("/")
    main_url = f"{iepms_host}/zte-crm-iepms-baseui/#/main/mainPortal"

    # 单实例锁：防止计划任务与 GUI 并发运行
    lock_f = acquire_single_instance()
    if lock_f is None:
        safe_print("[退出] 已有另一个监控实例在运行，本次跳过")
        return

    # 清理上次异常遗留的无头浏览器
    cleanup_orphan_browsers()

    # 加载花名册
    if not os.path.exists(ROSTER_FILE):
        safe_print(f"[错误] 找不到名单文件: {ROSTER_FILE}")
        return

    project_groups = {}
    all_roster_rows = []
    project_code_map = {}

    try:
        wb = openpyxl.load_workbook(ROSTER_FILE, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
        if len(rows) > 1:
            headers = [str(h or '').strip() for h in rows[0]]
            col_idx = {h: i for i, h in enumerate(headers) if h}
            for r in rows[1:]:
                if not r or all(v is None for v in r):
                    continue
                row_dict = {}
                for col_name, idx in col_idx.items():
                    val = r[idx] if idx < len(r) else ""
                    row_dict[col_name] = "" if val is None else str(val).strip()
                
                proj = row_dict.get("项目名称", "")
                if not proj:
                    continue
                acc = str(row_dict.get("打卡账号", "")).strip()
                if acc.endswith('.0'):
                    acc = acc[:-2]
                row_dict["打卡账号"] = acc

                if proj not in project_groups:
                    project_groups[proj] = []
                project_groups[proj].append(row_dict)
                all_roster_rows.append(row_dict)
                # 提取项目号（多别名超强容错兼容：项目号 / 项目编号 / 项目代码 / 项目ID / projectCode / projCode）
                pcode = (
                    row_dict.get("项目号", "")
                    or row_dict.get("项目编号", "")
                    or row_dict.get("项目代码", "")
                    or row_dict.get("项目ID", "")
                    or row_dict.get("ProjectCode", "")
                    or row_dict.get("projCode", "")
                ).strip()
                if pcode.endswith('.0'):
                    pcode = pcode[:-2]
                if pcode:
                    row_dict["项目号"] = pcode
                    if proj not in project_code_map:
                        project_code_map[proj] = pcode
    except Exception as e:
        safe_print(f"[错误] 读取花名册失败: {e}")
        return

    safe_print(f"[信息] 已加载 {len(project_groups)} 个项目, 共 {len(all_roster_rows)} 名员工")
    if project_code_map:
        safe_print(f"[信息] 已建立 {len(project_code_map)} 个项目的项目号映射")
    if not project_groups:
        safe_print("[错误] 花名册中没有可执行项目，本轮标记为配置异常，不写入成功心跳")
        return

    today_date = datetime.now().strftime("%Y-%m-%d")

    # 自动判定巡检模式：
    # 0:00 - 17:00（含 6:00-17:00 上班卡有效区间）执行均判定为【上班打卡】
    # 17:00 - 24:00（下班卡有效打卡区间）执行判定为【下班打卡】
    current_hour = datetime.now().hour
    if current_hour < 17:
        check_mode = "morning"
        mode_label = "上班打卡"
    else:
        check_mode = "evening"
        mode_label = "下班打卡"
    safe_print(f"[信息] 巡检模式: {mode_label}")

    # ==========================================
    # 阶段一: 登录
    # ==========================================
    safe_print("\n" + "=" * 60)
    safe_print("  阶段一: 登录")
    safe_print("=" * 60)

    login_ok = run_login()
    if not login_ok:
        safe_print("[错误] 登录失败，退出")
        return

    # ==========================================
    # 阶段二: 打开浏览器 + API 抓取
    # ==========================================
    safe_print("\n" + "=" * 60)
    safe_print("  阶段二: API 抓取考勤数据")
    safe_print("=" * 60)

    browser = None
    context = None
    try:
        with sync_playwright() as pw:
            browser_channel = str(cfg.get("browser_channel", "chrome")).strip()
            launch_kwargs = dict(
                headless=True,
                args=[
                    '--ignore-certificate-errors',
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-gpu'
                ]
            )
            if browser_channel:
                launch_kwargs["channel"] = browser_channel
            try:
                browser = pw.chromium.launch(**launch_kwargs)
            except Exception as e:
                if browser_channel == "chrome":
                    safe_print(f"[错误] 启动本机 Chrome 失败: {e}")
                    safe_print('  请确认已安装 Chrome；或在 config.json 将 browser_channel 改为 "chromium"')
                raise

            context = browser.new_context(
                storage_state=SESSION_FILE,
                viewport={'width': 1280, 'height': 800}
            )
            context.set_default_timeout(element_wait_ms)
            page = context.new_page()

            # 导航至主页（建立同源上下文，使 page.evaluate 的 fetch 携带会话）
            safe_print("[导航] 打开 iEPMS 主页...")
            page.goto(main_url, wait_until="load", timeout=page_load_ms)

            # 提取考勤的起止日期
            start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

            # 对每个项目执行考勤检查
            failed_projects = []
            processed_projects = set()
            analytics_records = []
            for project_name, group in project_groups.items():
                # 整轮时间预算：超限则优雅退出，未完成项目统一汇报
                if time.time() - run_start > run_budget_sec:
                    remaining = [p for p in project_groups.keys() if p not in processed_projects]
                    failed_projects.extend((p, "整轮超时未执行") for p in remaining)
                    safe_print(f"[超时] 整轮运行超过 {run_budget_sec // 60} 分钟预算，提前结束")
                    if remaining:
                        safe_print(f"[超时] 未执行项目: {'、'.join(remaining)}")
                    break

                safe_print(f"\n{'=' * 50}")
                safe_print(f"  项目: {project_name} (应打卡 {len(group)} 人)")
                safe_print(f"{'=' * 50}")

                proj_t0 = time.time()
                project_webhook = group[0].get('钉钉Webhook', '') if group else ''
                if not project_webhook or str(project_webhook) == 'nan' or str(project_webhook) == 'None':
                    project_webhook = cfg.get("default_webhook", "")

                unique_accounts = {
                    str(row.get('打卡账号', '')).strip().removesuffix('.0')
                    for row in group
                    if str(row.get('打卡账号', '')).strip()
                    and str(row.get('打卡账号', '')).strip().lower() not in {"none", "nan"}
                }
                if not unique_accounts:
                    reason = "花名册中没有有效打卡账号（配置异常）"
                    report_project_system_issue(
                        project_webhook, project_name, "config_error", reason,
                        check_mode, today_date,
                    )
                    failed_projects.append((project_name, reason))
                    processed_projects.add(project_name)
                    continue

                # 获取该项目的项目号（如果存在）
                project_code = project_code_map.get(project_name, None)
                records = fetch_attendance_api(page, project_name, start_date, today_date, cfg, project_code)

                # 令牌校验失败：先同会话轻量重试（网关抖动），
                # 仍失败才升级为重新登录并重建上下文（互踢/滑动过期）。
                if records is AUTH_EXPIRED:
                    page, context, records = recover_session_and_retry(
                        browser, context, page, project_name, start_date,
                        today_date, cfg, project_code, main_url, page_load_ms,
                        element_wait_ms, max_recover=int(cfg_t.get("max_session_recover", 2)),
                        transient_retry=int(cfg_t.get("transient_auth_retry", 2)),
                    )
                    if records is AUTH_EXPIRED or records is None:
                        reason = "令牌反复校验失败(重试+重登均无效)" if records is AUTH_EXPIRED else "API拉取失败"
                        safe_print(f"  [失败] {reason}")
                        failed_projects.append((project_name, reason))
                        processed_projects.add(project_name)
                        continue

                if records is None:
                    safe_print(f"  [失败] 未获取到考勤数据")
                    failed_projects.append((project_name, "API拉取失败"))
                    processed_projects.add(project_name)
                    continue
                if not records:
                    reason = "接口返回0条考勤记录（数据状态不明）"
                    report_project_system_issue(
                        project_webhook, project_name, "no_data", reason,
                        check_mode, today_date,
                    )
                    failed_projects.append((project_name, reason))
                    processed_projects.add(project_name)
                    continue

                analytics_records.extend(analytics_records_from_project(records, group, today_date))

                # 执行考勤检查
                check_result = check_attendance(
                    records, group, project_name, project_webhook,
                    check_mode, today_date,
                )
                if isinstance(check_result, dict) and check_result.get("status") != "success":
                    failed_projects.append((
                        project_name,
                        check_result.get("reason") or check_result.get("status") or "考勤判定未完成",
                    ))
                processed_projects.add(project_name)

                proj_cost = time.time() - proj_t0
                proj_budget = int(cfg_t.get("project_budget_sec", 120))
                if proj_cost > proj_budget:
                    safe_print(f"  [警告] 该项目耗时 {proj_cost:.0f}s，超过单项目预算 {proj_budget}s")
                # 内存即用完即弃
                del records

            # 失败项目统一汇报与心跳判定
            if failed_projects:
                names = "、".join(p for p, _ in failed_projects)
                safe_print(f"\n[汇总] ⚠️ 本轮存在失败项目: {names}，本次巡检未全部完成，不写入成功心跳")
            else:
                # 仅在全项目完整成功时写看门狗心跳标记
                write_heartbeat_ok(today_date, check_mode)

            if analytics_records:
                save_analytics_sync(analytics_records)
                safe_print(f"[信息] 已准备 {len(analytics_records)} 条考勤运营分析记录")

            total_elapsed = time.time() - run_start
            if failed_projects:
                safe_print(f"\n[完成] ⚠️ 考勤监控巡检未全部成功 (总耗时: {total_elapsed:.1f}s)")
            else:
                safe_print(f"\n[完成] 🏁 考勤监控巡检全部执行完毕 (总耗时: {total_elapsed:.1f}s)")

    except Exception as e:
        safe_print(f"[错误] 运行过程中发生异常: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # 资源闭环：context + browser 双关闭
        if context:
            try:
                context.close()
            except Exception:
                pass
        if browser:
            try:
                browser.close()
            except Exception:
                pass
        gc.collect()
        # 释放单实例锁
        try:
            lock_f.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
    sys.exit(0)
