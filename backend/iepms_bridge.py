# -*- coding: utf-8 -*-
"""Scoped local bridge for the DSH iEPMS attendance plugin.

This program exposes sanitized reads and explicit local configuration updates.
It deliberately exposes no login, monitor, DingTalk delivery, export, scheduler
mutation or arbitrary-command capability. It emits one JSON response on stdout;
diagnostic output is never written to stdout.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from contextlib import redirect_stdout
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


# The desktop host decodes the bridge protocol as UTF-8. Windows Python uses
# the active console code page (usually GBK) for redirected stdout unless the
# protocol explicitly pins an encoding.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="strict")


SCHEMA_VERSION = 1
MAX_REQUEST_BYTES = 16 * 1024
READ_COMMANDS = {"status", "roster-summary", "recent-runs", "schedule-status", "configuration-read", "personal-attendance"}
WRITE_COMMANDS = {"configuration-update"}
ALLOWED_COMMANDS = READ_COMMANDS | WRITE_COMMANDS
SCRIPT_ROOT = Path(__file__).resolve().parent
ROOT = Path(os.environ.get("IEPMS_BACKEND_ROOT", str(SCRIPT_ROOT))).resolve()
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
CONFIG_FILE = ROOT / "config.json"
ROSTER_FILE = ROOT / "roster.xlsx"
LOG_FILE = ROOT / "run_log.txt"
LAST_DATA_FILE = ROOT / "last_attendance_data.json"
PERSONAL_HISTORY_FILE = ROOT / ".personal_attendance_history.json"


def emit(command: str, data: dict[str, Any] | None = None, error: tuple[str, str] | None = None) -> int:
    payload: dict[str, Any] = {"ok": error is None, "schemaVersion": SCHEMA_VERSION, "command": command}
    if error is not None:
        payload["error"] = {"code": error[0], "message": error[1]}
    else:
        payload["data"] = data if data is not None else {}
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    sys.stdout.flush()
    return 0 if error is None else 2


class BridgeInputError(ValueError):
    pass


def read_request() -> tuple[str | None, dict[str, Any] | None, tuple[str, str] | None]:
    raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
    if len(raw) > MAX_REQUEST_BYTES:
        return None, None, ("REQUEST_TOO_LARGE", "请求过大。")
    try:
        value = json.loads(raw.decode("utf-8"))
    except Exception:
        return None, None, ("INVALID_JSON", "请求必须是 JSON 对象。")
    if not isinstance(value, dict) or value.get("version") != SCHEMA_VERSION:
        return None, None, ("INVALID_REQUEST", "请求版本无效。")
    command = value.get("command")
    if command not in ALLOWED_COMMANDS:
        return str(command or "unknown"), None, ("COMMAND_NOT_ALLOWED", "该桥接命令不受支持。")
    if command in READ_COMMANDS:
        if set(value) != {"version", "command"}:
            return str(command), None, ("INVALID_REQUEST", "只读状态命令不接受额外参数。")
        return str(command), None, None
    if set(value) != {"version", "command", "settings"} or not isinstance(value.get("settings"), dict):
        return str(command), None, ("INVALID_REQUEST", "配置更新请求格式无效。")
    return str(command), value["settings"], None


def read_config() -> tuple[dict[str, Any], bool]:
    if not CONFIG_FILE.exists():
        return {}, False
    try:
        value = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return (value if isinstance(value, dict) else {}), isinstance(value, dict)
    except Exception:
        return {}, False


def version() -> str:
    try:
        text = (ROOT / "version.py").read_text(encoding="utf-8", errors="replace")
        match = re.search(r"^APP_VERSION\s*=\s*['\"]([^'\"]+)['\"]", text, re.MULTILINE)
        if match:
            return match.group(1)
    except Exception:
        pass
    return "unknown"


def status() -> dict[str, Any]:
    config, valid = read_config()
    export_settings = config.get("export_settings") if isinstance(config.get("export_settings"), dict) else {}
    return {
        "application": {"name": "iEPMS 考勤自动监控系统", "version": version(), "backendRootAvailable": ROOT.exists()},
        "configuration": {
            "fileAvailable": CONFIG_FILE.exists(),
            "valid": valid,
            "accountConfigured": bool(str(config.get("username", "")).strip()),
            "webhookConfigured": bool(str(config.get("default_webhook", "")).strip()),
            "browserConfigured": bool(str(config.get("browser_channel", "")).strip()),
        },
        "data": {
            "rosterAvailable": ROSTER_FILE.exists(),
            "logAvailable": LOG_FILE.exists(),
            "lastDataAvailable": LAST_DATA_FILE.exists(),
        },
        "safety": {"mode": "read-only", "automaticActionsEnabled": False},
    }


def configuration_view(config: dict[str, Any] | None = None) -> dict[str, Any]:
    import keyring_utils
    if config is None:
        config, _ = read_config()
    username = str(config.get("username", "")).strip()
    browser_channel = str(config.get("browser_channel", "chrome")).strip()
    if browser_channel not in {"chrome", "chromium", "msedge"}:
        browser_channel = "chrome"
    # Credential backends may emit diagnostics. Keep stdout reserved for the
    # single JSON bridge response even when a backend is unavailable.
    with redirect_stdout(sys.stderr):
        password_configured = bool(keyring_utils.get_password(username)) if username else False
    return {
        "accountConfigured": bool(username),
        "accountMasked": keyring_utils.mask_account(username) if username else "",
        "passwordConfigured": password_configured,
        "webhookConfigured": bool(str(config.get("default_webhook", "")).strip()),
        "browserChannel": browser_channel,
        "overnightExemptAttendance": bool(config.get("overnight_exempt_attendance", True)),
        "overnightCheckWorkHours": bool(config.get("overnight_check_work_hours", False)),
    }


def parse_configuration_update(settings: dict[str, Any]) -> dict[str, Any]:
    allowed = {
        "username", "password", "defaultWebhook", "browserChannel",
        "overnightExemptAttendance", "overnightCheckWorkHours",
    }
    if set(settings) - allowed:
        raise BridgeInputError("配置中包含不受支持的字段。")
    parsed: dict[str, Any] = {}
    for key, limit in (("username", 100), ("password", 512), ("defaultWebhook", 2048)):
        if key not in settings:
            continue
        if not isinstance(settings[key], str):
            raise BridgeInputError(f"{key} 必须是字符串。")
        value = settings[key].strip() if key != "password" else settings[key]
        if len(value) > limit:
            raise BridgeInputError(f"{key} 长度超过限制。")
        parsed[key] = value
    if "username" in parsed and parsed["username"] and not re.fullmatch(r"[A-Za-z0-9_.@-]+", parsed["username"]):
        raise BridgeInputError("工号只能包含字母、数字及 . _ @ -。")
    if "defaultWebhook" in parsed and parsed["defaultWebhook"]:
        url = urlparse(parsed["defaultWebhook"])
        if url.scheme != "https" or not url.netloc:
            raise BridgeInputError("Webhook 必须是有效的 HTTPS 地址。")
    if "browserChannel" in settings:
        if settings["browserChannel"] not in {"chrome", "chromium", "msedge"}:
            raise BridgeInputError("浏览器通道必须是 chrome、chromium 或 msedge。")
        parsed["browserChannel"] = settings["browserChannel"]
    for key in ("overnightExemptAttendance", "overnightCheckWorkHours"):
        if key in settings:
            if not isinstance(settings[key], bool):
                raise BridgeInputError(f"{key} 必须是布尔值。")
            parsed[key] = settings[key]
    return parsed


def write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    handle, temp_name = tempfile.mkstemp(prefix=f"{path.stem}.", suffix=".tmp", dir=ROOT)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def write_config_atomic(config: dict[str, Any]) -> None:
    write_json_atomic(CONFIG_FILE, config)


def update_configuration(settings: dict[str, Any]) -> dict[str, Any]:
    import keyring_utils
    config, valid = read_config()
    if CONFIG_FILE.exists() and not valid:
        raise BridgeInputError("现有 config.json 无效，已拒绝覆盖。")
    patch = parse_configuration_update(settings)
    current_username = str(config.get("username", "")).strip()
    next_username = patch.get("username", current_username)
    password = patch.get("password", "")
    if next_username != current_username and not password:
        raise BridgeInputError("更换工号时必须同时填写密码。")
    if password:
        if not next_username:
            raise BridgeInputError("设置密码前必须填写工号。")
        with redirect_stdout(sys.stderr):
            stored = keyring_utils.set_password(next_username, password)
        if not stored:
            raise BridgeInputError("密码写入 Windows 安全凭据存储失败。")
    if "username" in patch:
        config["username"] = next_username
    if "defaultWebhook" in patch:
        config["default_webhook"] = patch["defaultWebhook"]
    if "browserChannel" in patch:
        config["browser_channel"] = patch["browserChannel"]
    if "overnightExemptAttendance" in patch:
        config["overnight_exempt_attendance"] = patch["overnightExemptAttendance"]
    if "overnightCheckWorkHours" in patch:
        config["overnight_check_work_hours"] = patch["overnightCheckWorkHours"]
    config.pop("password", None)
    write_config_atomic(config)
    return configuration_view(config)


def normalize_account(value: Any) -> str:
    account = str(value or "").strip()
    return account[:-2] if account.endswith(".0") else account


def normalize_clock(value: Any) -> str:
    text = str(value or "").strip()
    match = re.search(r"(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?$", text)
    if match is None:
        return ""
    hour, minute = int(match.group(1)), int(match.group(2))
    return f"{hour:02d}:{minute:02d}" if hour < 24 and minute < 60 else ""


def sanitize_personal_record(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    date_value = str(value.get("date", "")).strip()
    try:
        datetime.strptime(date_value, "%Y-%m-%d")
    except ValueError:
        return None
    state = str(value.get("status", ""))
    if state not in {"normal", "late", "early", "missing", "checked-in", "pending"}:
        return None
    minutes = value.get("workMinutes")
    if not isinstance(minutes, int) or not 0 <= minutes <= 24 * 60:
        minutes = None
    return {
        "date": date_value,
        "clockIn": normalize_clock(value.get("clockIn")),
        "clockOut": normalize_clock(value.get("clockOut")),
        "workMinutes": minutes,
        "status": state,
    }


def personal_record_from_latest(config: dict[str, Any]) -> dict[str, Any] | None:
    username = normalize_account(config.get("username"))
    if not username or not LAST_DATA_FILE.exists():
        return None
    try:
        source = json.loads(LAST_DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(source, dict):
        return None
    morning_source = source.get("morning") if isinstance(source.get("morning"), list) else []
    evening_source = source.get("evening") if isinstance(source.get("evening"), list) else []
    morning = [row for row in morning_source if isinstance(row, dict) and normalize_account(row.get("打卡账号")) == username]
    evening = [row for row in evening_source if isinstance(row, dict) and normalize_account(row.get("打卡账号")) == username]
    if not morning and not evening:
        return None
    clock_in_values = [normalize_clock(row.get("打卡时间")) for row in morning]
    clock_in_values += [normalize_clock(row.get("最早打卡")) for row in evening]
    clock_out_values = [normalize_clock(row.get("最晚打卡")) for row in evening]
    clock_in_values = [value for value in clock_in_values if value]
    clock_out_values = [value for value in clock_out_values if value]
    clock_in = min(clock_in_values) if clock_in_values else ""
    clock_out = max(clock_out_values) if clock_out_values else ""
    if clock_out == clock_in:
        clock_out = ""
    status_text = " ".join(str(row.get(key, "")) for row in morning + evening for key in ("上班状态", "下班状态", "工时质检"))
    if "迟到" in status_text:
        state = "late"
    elif "早退" in status_text or "不足" in status_text:
        state = "early"
    elif any(word in status_text for word in ("缺卡", "未出勤", "未打下班卡")):
        state = "missing"
    elif clock_in and clock_out:
        state = "normal"
    elif clock_in:
        state = "checked-in"
    else:
        state = "pending"
    hours = []
    for row in evening:
        try:
            amount = float(row.get("核算工时(h)", ""))
            if 0 <= amount <= 24:
                hours.append(amount)
        except (TypeError, ValueError):
            pass
    return sanitize_personal_record({
        "date": source.get("date"), "clockIn": clock_in, "clockOut": clock_out,
        "workMinutes": round(max(hours) * 60) if hours else None, "status": state,
    })


def read_personal_history(account_hash: str) -> list[dict[str, Any]]:
    if not PERSONAL_HISTORY_FILE.exists():
        return []
    try:
        value = json.loads(PERSONAL_HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(value, dict) or value.get("schemaVersion") != 1 or value.get("accountHash") != account_hash:
        return []
    raw_records = value.get("records") if isinstance(value.get("records"), list) else []
    return [record for item in raw_records if (record := sanitize_personal_record(item)) is not None]


def personal_attendance() -> dict[str, Any]:
    import keyring_utils
    config, valid = read_config()
    username = normalize_account(config.get("username")) if valid else ""
    if not username:
        return {"configured": False, "accountMasked": "", "records": [], "source": {"latestAvailable": LAST_DATA_FILE.exists(), "historyDays": 0}}
    account_hash = hashlib.sha256(username.encode("utf-8")).hexdigest()
    records = read_personal_history(account_hash)
    latest = personal_record_from_latest(config)
    if latest is not None:
        by_date = {str(item["date"]): item for item in records}
        by_date[latest["date"]] = latest
        records = sorted(by_date.values(), key=lambda item: item["date"])[-400:]
        write_json_atomic(PERSONAL_HISTORY_FILE, {"schemaVersion": 1, "accountHash": account_hash, "records": records})
    with redirect_stdout(sys.stderr):
        masked = keyring_utils.mask_account(username)
    return {
        "configured": True, "accountMasked": masked, "records": records,
        "source": {"latestAvailable": latest is not None, "historyDays": len(records)},
    }


def roster_summary() -> dict[str, Any]:
    if not ROSTER_FILE.exists():
        return {"projectCount": 0, "personCount": 0, "rosterAvailable": False}
    try:
        import openpyxl  # Existing application dependency; no network access.
        workbook = openpyxl.load_workbook(ROSTER_FILE, read_only=True, data_only=True)
        sheet = workbook.active
        rows = sheet.iter_rows(values_only=True)
        header = [str(value or "").strip() for value in next(rows, ())]
        project_index = header.index("项目名称") if "项目名称" in header else 0
        account_index = next((header.index(name) for name in ("打卡账号", "工号", "账号") if name in header), -1)
        projects: set[str] = set()
        people: set[str] = set()
        anonymous = 0
        for row in rows:
            if not row or project_index >= len(row) or not row[project_index]:
                continue
            projects.add(str(row[project_index]).strip())
            if account_index >= 0 and account_index < len(row) and row[account_index]:
                people.add(str(row[account_index]).strip().removesuffix(".0"))
            else:
                anonymous += 1
        workbook.close()
        return {"projectCount": len(projects), "personCount": len(people) + anonymous, "rosterAvailable": True}
    except ModuleNotFoundError:
        return {"projectCount": 0, "personCount": 0, "rosterAvailable": True}
    except Exception:
        return {"projectCount": 0, "personCount": 0, "rosterAvailable": True}


def redact(text: str) -> str:
    value = re.sub(r"https?://[^\s]+", "[已隐藏地址]", text)
    value = re.sub(r"(?i)(password|passwd|token|cookie|webhook)\s*[:=]\s*\S+", r"\1=[已隐藏]", value)
    value = re.sub(r"(?<!\d)1\d{10}(?!\d)", "[已隐藏手机号]", value)
    value = re.sub(r"\b\d{15,19}\b", "[已隐藏标识]", value)
    return value[:120]


def recent_runs() -> list[dict[str, str]]:
    if not LOG_FILE.exists():
        return []
    try:
        lines = LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines()[-500:]
    except Exception:
        return []
    result: list[dict[str, str]] = []
    timestamp_re = re.compile(r"^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s*(.*)$")
    for line in reversed(lines):
        match = timestamp_re.match(line)
        if not match:
            continue
        text = match.group(2)
        if "[完成]" in text:
            level = "ok" if "全部执行完毕" in text else "warning"
            summary = "巡检完成" if level == "ok" else "巡检未完整完成"
        elif "[错误]" in text or "[超时]" in text:
            level, summary = "error", "巡检出现异常或超时"
        elif "[警告]" in text or "[异常]" in text:
            level, summary = "warning", "巡检发现需要人工核查的状态"
        elif "登录成功" in text:
            level, summary = "info", "本地会话已更新"
        else:
            continue
        item = {"timestamp": match.group(1), "level": level, "summary": redact(summary)}
        if item not in result:
            result.append(item)
        if len(result) == 8:
            break
    return list(reversed(result))


def schedule_status() -> dict[str, Any]:
    if os.name != "nt":
        return {"supported": False, "tasks": [], "message": "计划任务状态仅支持 Windows。"}
    script = "Get-ScheduledTask -TaskName 'iEPMS_*' -ErrorAction SilentlyContinue | Select-Object TaskName,State | ConvertTo-Json -Compress"
    try:
        result = subprocess.run(["powershell", "-NoProfile", "-Command", script], capture_output=True, text=True, timeout=5, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000))
        if result.returncode != 0 or not result.stdout.strip():
            return {"supported": True, "tasks": [], "message": "未检测到已管理的 iEPMS 计划任务。"}
        raw = json.loads(result.stdout)
        values = raw if isinstance(raw, list) else [raw]
        tasks = []
        # ScheduledTask.State is serialized as an enum number on some Windows
        # PowerShell versions and as its English name on others.
        states = {
            "Ready": "ready", "Running": "running", "Disabled": "disabled",
            "3": "ready", "4": "running", "1": "disabled",
        }
        for item in values:
            if not isinstance(item, dict):
                continue
            name = str(item.get("TaskName", ""))
            if name.startswith("iEPMS_"):
                tasks.append({"name": name, "state": states.get(str(item.get("State", "")), "unknown")})
        return {"supported": True, "tasks": tasks}
    except Exception:
        return {"supported": True, "tasks": [], "message": "暂时无法读取计划任务状态。"}


def main() -> int:
    command, settings, error = read_request()
    if error is not None:
        return emit(command or "unknown", error=error)
    try:
        handlers = {
            "status": status,
            "roster-summary": roster_summary,
            "recent-runs": recent_runs,
            "schedule-status": schedule_status,
            "configuration-read": configuration_view,
            "personal-attendance": personal_attendance,
            "configuration-update": lambda: update_configuration(settings or {}),
        }
        return emit(command, data=handlers[command]())
    except BridgeInputError as exc:
        return emit(command, error=("INVALID_CONFIGURATION", str(exc)))
    except Exception:
        return emit(command, error=("BRIDGE_FAILURE", "本地状态读取失败。"))


if __name__ == "__main__":
    raise SystemExit(main())

