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
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from contextlib import redirect_stdout
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


# The desktop host decodes the bridge protocol as UTF-8. Windows Python uses
# the active console code page (usually GBK) for redirected stdout unless the
# protocol explicitly pins an encoding.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="strict")


SCHEMA_VERSION = 1
MAX_REQUEST_BYTES = 512 * 1024
READ_COMMANDS = {"status", "roster-summary", "roster-read", "personal-roster-read", "recent-runs", "schedule-status", "configuration-read", "personal-attendance", "personal-automation-read", "personal-makeup-read", "management-run-read", "management-log-read", "management-analytics-read", "management-analytics-person-read"}
FILTERED_READ_COMMANDS = {"management-analytics-read", "management-analytics-person-read"}
WRITE_COMMANDS = {"configuration-update", "roster-update", "personal-roster-update", "personal-account-update", "personal-run-start", "personal-schedule-update", "personal-reminder-settings-update", "personal-reminder-delivery-reserve", "personal-reminder-delivery-complete", "personal-startup-claim", "personal-makeup-submit", "management-run-start"}
ALLOWED_COMMANDS = READ_COMMANDS | WRITE_COMMANDS
SCRIPT_ROOT = Path(__file__).resolve().parent
RUNTIME_ROOT = SCRIPT_ROOT / "runtime"
DATA_ROOT = Path(os.environ.get("IEPMS_PLUGIN_DATA_ROOT", Path(os.environ.get("LOCALAPPDATA", Path.home())) / "DeepSeek Harness" / "plugins" / "iepms-attendance-plugin")).resolve()
DATA_ROOT.mkdir(parents=True, exist_ok=True)
if str(RUNTIME_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNTIME_ROOT))
if os.environ.get("IEPMS_PLUGIN_TEST_RUNTIME") == "1":
    sys.path.insert(0, str(DATA_ROOT))

from attendance_rules import is_late_night_completion


def migrate_legacy_data() -> None:
    marker = DATA_ROOT / ".legacy-import-v1"
    legacy = os.environ.get("IEPMS_LEGACY_IMPORT_ROOT", "").strip()
    if marker.exists() or not legacy:
        return
    source = Path(legacy).expanduser().resolve()
    if not source.is_dir() or source == DATA_ROOT:
        return
    for name in ("config.json", "roster.xlsx", "iepms-attendance-plugin.db", "last_attendance_data.json", ".personal_attendance_history.json", ".personal_attendance_run.json", "session_state.json"):
        candidate = source / name
        destination = DATA_ROOT / name
        if candidate.is_file() and not destination.exists():
            shutil.copy2(candidate, destination)
    marker.write_text("migrated", encoding="utf-8")


migrate_legacy_data()
CONFIG_FILE = DATA_ROOT / "config.json"
ROSTER_FILE = DATA_ROOT / "roster.xlsx"
PLUGIN_DATABASE_FILE = DATA_ROOT / "iepms-attendance-plugin.db"
LOG_FILE = DATA_ROOT / "run_log.txt"
LAST_DATA_FILE = DATA_ROOT / "last_attendance_data.json"
PERSONAL_HISTORY_FILE = DATA_ROOT / ".personal_attendance_history.json"
PERSONAL_RUN_FILE = DATA_ROOT / ".personal_attendance_run.json"
MANAGEMENT_SYNC_FILE = DATA_ROOT / "management_attendance_sync.json"
PERSONAL_TASK_PREFIX = "iEPMS_Personal_"
ROSTER_FIELDS = (
    ("projectName", "项目名称", 200), ("projectCode", "项目号", 100),
    ("name", "姓名", 100), ("city", "地市", 100),
    ("account", "打卡账号", 100), ("webhook", "钉钉Webhook", 2048),
    ("mobile", "手机号", 30), ("dingtalkId", "钉钉号", 100),
)


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
        allowed = {"version", "command", "settings"} if command in FILTERED_READ_COMMANDS else {"version", "command"}
        if set(value) != allowed or (command in FILTERED_READ_COMMANDS and not isinstance(value.get("settings"), dict)):
            return str(command), None, ("INVALID_REQUEST", "只读状态命令不接受额外参数。")
        return str(command), value.get("settings") if command in FILTERED_READ_COMMANDS else None, None
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
        text = (RUNTIME_ROOT / "version.py").read_text(encoding="utf-8", errors="replace")
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
        "application": {"name": "插件内置后端", "version": version(), "dataRootAvailable": DATA_ROOT.exists()},
        "configuration": {
            "fileAvailable": CONFIG_FILE.exists(),
            "valid": valid,
            "accountConfigured": bool(str(config.get("username", "")).strip()),
            "webhookConfigured": bool(str(config.get("default_webhook", "")).strip()),
            "browserConfigured": bool(str(config.get("browser_channel", "")).strip()),
        },
        "data": {
            "rosterAvailable": PLUGIN_DATABASE_FILE.exists(),
            "logAvailable": LOG_FILE.exists(),
            "lastDataAvailable": LAST_DATA_FILE.exists(),
        },
        "safety": {"mode": "read-only", "automaticActionsEnabled": False},
    }


def configuration_view(config: dict[str, Any] | None = None) -> dict[str, Any]:
    import keyring_utils
    valid = True
    if config is None:
        config, valid = read_config()
    config = ensure_default_credentials(config, valid)
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


def ensure_default_credentials(config: dict[str, Any], valid: bool = True) -> dict[str, Any]:
    """Seed the packaged login only when the user has not configured one yet."""
    if CONFIG_FILE.exists() and not valid:
        raise BridgeInputError("现有 config.json 无效，已拒绝覆盖。")
    if str(config.get("username", "")).strip():
        return config
    import keyring_utils
    from default_credentials import load_packaged_credentials
    username, password = load_packaged_credentials()
    with redirect_stdout(sys.stderr):
        if not keyring_utils.set_password(username, password):
            raise BridgeInputError("默认账号密码写入本地安全存储失败。")
    updated = {**config, "username": username}
    write_config_atomic(updated)
    return updated


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
    handle, temp_name = tempfile.mkstemp(prefix=f"{path.stem}.", suffix=".tmp", dir=DATA_ROOT)
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


def database_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(PLUGIN_DATABASE_FILE, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 15000")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def database_setting(connection: sqlite3.Connection, key: str, default: str = "") -> str:
    row = connection.execute("SELECT value FROM plugin_settings WHERE key = ?", (key,)).fetchone()
    return str(row["value"]) if row is not None else default


def set_database_setting(connection: sqlite3.Connection, key: str, value: str) -> None:
    connection.execute(
        "INSERT INTO plugin_settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


def read_excel_roster_rows() -> list[dict[str, str]]:
    if not ROSTER_FILE.exists():
        return []
    try:
        import openpyxl
        workbook = openpyxl.load_workbook(ROSTER_FILE, read_only=True, data_only=True)
        sheet = workbook.active
        values = list(sheet.iter_rows(values_only=True))
        workbook.close()
    except Exception as exc:
        raise BridgeInputError("花名册读取失败，请确认文件未损坏。") from exc
    headers = [str(value or "").strip() for value in values[0]] if values else []
    label_to_key = {label: key for key, label, _ in ROSTER_FIELDS}
    result = []
    for source in values[1:]:
        row = {key: "" for key, _, _ in ROSTER_FIELDS}
        for index, label in enumerate(headers):
            key = label_to_key.get(label)
            if key is None or index >= len(source):
                continue
            text = str(source[index] or "").strip()
            row[key] = text[:-2] if key in {"account", "projectCode", "mobile"} and text.endswith(".0") else text
        if any(row.values()):
            result.append(row)
    return result


def ensure_plugin_database() -> None:
    """Create the plugin-owned database and import legacy local state once."""
    connection = database_connection()
    try:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS plugin_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS roster (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_name TEXT NOT NULL,
                project_code TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL,
                city TEXT NOT NULL DEFAULT '',
                account TEXT NOT NULL,
                webhook TEXT NOT NULL DEFAULT '',
                mobile TEXT NOT NULL DEFAULT '',
                dingtalk_id TEXT NOT NULL DEFAULT '',
                display_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS roster_account_index ON roster(account);
            CREATE TABLE IF NOT EXISTS personal_history (
                account_hash TEXT NOT NULL,
                attendance_date TEXT NOT NULL,
                clock_in TEXT NOT NULL DEFAULT '',
                clock_out TEXT NOT NULL DEFAULT '',
                work_minutes INTEGER,
                status TEXT NOT NULL,
                PRIMARY KEY (account_hash, attendance_date)
            );
            CREATE TABLE IF NOT EXISTS personal_run_state (
                singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                state TEXT NOT NULL,
                pid INTEGER,
                started_at TEXT NOT NULL DEFAULT '',
                completed_at TEXT NOT NULL DEFAULT '',
                message TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS personal_makeup_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                attendance_date TEXT NOT NULL,
                request_kind TEXT NOT NULL CHECK (request_kind IN ('makeup', 'overtime')),
                overtime_date TEXT NOT NULL DEFAULT '',
                reason TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'local-pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(account_hash, attendance_date)
            );
            CREATE INDEX IF NOT EXISTS personal_makeup_request_account_index
            ON personal_makeup_requests(account_hash, attendance_date);
            CREATE TABLE IF NOT EXISTS personal_reminder_settings (
                singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                startup_inspection INTEGER NOT NULL DEFAULT 0,
                use_pet INTEGER NOT NULL DEFAULT 1,
                fallback_notification INTEGER NOT NULL DEFAULT 1,
                night_safety INTEGER NOT NULL DEFAULT 0,
                shift_type TEXT NOT NULL DEFAULT 'day'
                    CHECK (shift_type IN ('day', 'night', 'flexible', 'off'))
            );
            INSERT OR IGNORE INTO personal_reminder_settings (singleton) VALUES (1);
            CREATE TABLE IF NOT EXISTS personal_reminder_delivery (
                event_id TEXT PRIMARY KEY,
                account_hash TEXT NOT NULL,
                attendance_date TEXT NOT NULL,
                reminder_type TEXT NOT NULL,
                channel TEXT NOT NULL CHECK (channel IN ('pet', 'desktop', 'plugin')),
                status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed')),
                created_at TEXT NOT NULL,
                delivered_at TEXT NOT NULL DEFAULT '',
                expires_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS personal_reminder_delivery_dedup_index
            ON personal_reminder_delivery(account_hash, attendance_date, reminder_type, created_at);
            CREATE TABLE IF NOT EXISTS personal_startup_run (
                account_hash TEXT NOT NULL,
                attendance_date TEXT NOT NULL,
                claimed_at TEXT NOT NULL,
                PRIMARY KEY (account_hash, attendance_date)
            );
            CREATE TABLE IF NOT EXISTS management_run_state (
                singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                state TEXT NOT NULL,
                pid INTEGER,
                started_at TEXT NOT NULL DEFAULT '',
                completed_at TEXT NOT NULL DEFAULT '',
                message TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS management_attendance_history (
                account TEXT NOT NULL,
                attendance_date TEXT NOT NULL,
                clock_in TEXT NOT NULL DEFAULT '',
                clock_out TEXT NOT NULL DEFAULT '',
                work_minutes INTEGER,
                status TEXT NOT NULL,
                captured_at TEXT NOT NULL,
                PRIMARY KEY (account, attendance_date)
            );
            CREATE INDEX IF NOT EXISTS management_attendance_history_date_index
            ON management_attendance_history(attendance_date);
        """)
        if database_setting(connection, "legacy-import-v1"):
            connection.commit()
            return
        legacy_rows = read_excel_roster_rows()
        now = datetime.now().isoformat(timespec="seconds")
        for index, row in enumerate(legacy_rows):
            connection.execute(
                """INSERT INTO roster (
                    project_name, project_code, name, city, account, webhook, mobile, dingtalk_id,
                    display_order, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                tuple(row.get(key, "") for key, _, _ in ROSTER_FIELDS) + (index, now, now),
            )
        config, valid = read_config()
        if valid:
            personal_account = normalize_account(config.get("personal_account"))
            if personal_account:
                set_database_setting(connection, "personal-account", personal_account)
            times = config.get("personal_schedule_times") if isinstance(config.get("personal_schedule_times"), list) else []
            safe_times = [str(value) for value in times if re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", str(value))][:4]
            set_database_setting(connection, "personal-schedule-enabled", "1" if config.get("personal_schedule_enabled", False) else "0")
            set_database_setting(connection, "personal-schedule-times", json.dumps(safe_times, ensure_ascii=False))
        set_database_setting(connection, "legacy-import-v1", now)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def read_roster_records() -> list[tuple[int, dict[str, str]]]:
    ensure_plugin_database()
    connection = database_connection()
    try:
        rows = connection.execute(
            """SELECT id, project_name, project_code, name, city, account, webhook, mobile, dingtalk_id
            FROM roster ORDER BY display_order, id"""
        ).fetchall()
        return [(int(row["id"]), {
            "projectName": str(row["project_name"]), "projectCode": str(row["project_code"]),
            "name": str(row["name"]), "city": str(row["city"]), "account": str(row["account"]),
            "webhook": str(row["webhook"]), "mobile": str(row["mobile"]), "dingtalkId": str(row["dingtalk_id"]),
        }) for row in rows]
    finally:
        connection.close()


def read_roster_rows() -> list[dict[str, str]]:
    return [row for _, row in read_roster_records()]


def roster_row_id(record_id: int) -> str:
    return f"r-{record_id}"


def sanitize_roster_row(record_id: int, row: dict[str, str]) -> dict[str, Any]:
    return {
        "rowId": roster_row_id(record_id),
        **{key: value for key, value in row.items() if key != "webhook"},
        "webhookConfigured": bool(row.get("webhook")),
    }


def roster_view() -> dict[str, Any]:
    rows = read_roster_records()
    return {"rows": [sanitize_roster_row(record_id, row) for record_id, row in rows], "backupAvailable": False}


def parse_roster_patch(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise BridgeInputError("花名册行格式无效。")
    allowed = {"rowId", "projectName", "projectCode", "name", "city", "account", "mobile", "dingtalkId", "webhook", "webhookConfigured"}
    if set(value) - allowed:
        raise BridgeInputError("花名册包含不受支持的字段。")
    parsed: dict[str, Any] = {}
    row_id = value.get("rowId", "")
    if not isinstance(row_id, str) or len(row_id) > 64:
        raise BridgeInputError("花名册行标识无效。")
    parsed["rowId"] = row_id
    if "webhookConfigured" in value and not isinstance(value["webhookConfigured"], bool):
        raise BridgeInputError("Webhook 配置状态无效。")
    for key, _, limit in ROSTER_FIELDS:
        if key == "webhook" and key not in value:
            continue
        raw = value.get(key, "")
        if not isinstance(raw, str):
            raise BridgeInputError("花名册字段必须是字符串。")
        text = raw.strip()
        if len(text) > limit:
            raise BridgeInputError("花名册字段长度超过限制。")
        parsed[key] = text
    if not parsed.get("projectName") or not parsed.get("name") or not parsed.get("account"):
        raise BridgeInputError("项目名称、姓名和打卡账号不能为空。")
    if not re.fullmatch(r"[A-Za-z0-9_.@-]+", parsed["account"]):
        raise BridgeInputError("打卡账号只能包含字母、数字及 . _ @ -。")
    if "webhook" in parsed and parsed["webhook"]:
        url = urlparse(parsed["webhook"])
        if url.scheme != "https" or not url.netloc:
            raise BridgeInputError("钉钉 Webhook 必须是有效的 HTTPS 地址。")
    return parsed


def write_roster_rows(rows: list[tuple[int | None, dict[str, str]]]) -> None:
    ensure_plugin_database()
    connection = database_connection()
    try:
        existing_ids = {int(row["id"]) for row in connection.execute("SELECT id FROM roster")}
        retained_ids: set[int] = set()
        now = datetime.now().isoformat(timespec="seconds")
        for order, (record_id, row) in enumerate(rows):
            values = tuple(row.get(key, "") for key, _, _ in ROSTER_FIELDS)
            if record_id is not None and record_id in existing_ids:
                connection.execute(
                    """UPDATE roster SET project_name = ?, project_code = ?, name = ?, city = ?, account = ?,
                    webhook = ?, mobile = ?, dingtalk_id = ?, display_order = ?, updated_at = ? WHERE id = ?""",
                    values + (order, now, record_id),
                )
                retained_ids.add(record_id)
            else:
                cursor = connection.execute(
                    """INSERT INTO roster (
                        project_name, project_code, name, city, account, webhook, mobile, dingtalk_id,
                        display_order, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    values + (order, now, now),
                )
                retained_ids.add(int(cursor.lastrowid))
        if retained_ids:
            placeholders = ",".join("?" for _ in retained_ids)
            connection.execute(f"DELETE FROM roster WHERE id NOT IN ({placeholders})", tuple(retained_ids))
        else:
            connection.execute("DELETE FROM roster")
        connection.commit()
    finally:
        connection.close()


def merge_roster_patches(patches: list[dict[str, Any]]) -> list[tuple[int | None, dict[str, str]]]:
    existing = read_roster_records()
    existing_by_id = {roster_row_id(record_id): (record_id, row) for record_id, row in existing}
    existing_by_account = {normalize_account(row.get("account")): (record_id, row) for record_id, row in existing}
    result = []
    seen_accounts: set[str] = set()
    for patch in patches:
        account = normalize_account(patch.get("account"))
        if account in seen_accounts:
            raise BridgeInputError(f"打卡账号 {account} 重复，请合并后再保存。")
        seen_accounts.add(account)
        record_id, source = existing_by_id.get(str(patch.get("rowId", "")), existing_by_account.get(account, (None, {})))
        row = {key: str(patch.get(key, source.get(key, ""))) for key, _, _ in ROSTER_FIELDS}
        row["account"] = account
        result.append((record_id, row))
    return result


def update_roster(settings: dict[str, Any]) -> dict[str, Any]:
    if set(settings) != {"rows"} or not isinstance(settings.get("rows"), list):
        raise BridgeInputError("花名册更新格式无效。")
    if len(settings["rows"]) > 2000:
        raise BridgeInputError("花名册最多支持 2000 行。")
    patches = [parse_roster_patch(value) for value in settings["rows"]]
    write_roster_rows(merge_roster_patches(patches))
    return roster_view()


def personal_roster_view() -> dict[str, Any]:
    account = personal_account()
    if not account:
        return {"configured": False, "row": None, "duplicateCount": 0}
    matches = [(record_id, row) for record_id, row in read_roster_records() if normalize_account(row.get("account")) == account]
    safe_row = sanitize_roster_row(*matches[0]) if matches else None
    if safe_row is not None:
        safe_row["account"] = ""
    return {"configured": True, "row": safe_row, "duplicateCount": len(matches)}


def update_personal_roster(settings: dict[str, Any]) -> dict[str, Any]:
    if set(settings) != {"row"}:
        raise BridgeInputError("个人花名册更新格式无效。")
    account = personal_account()
    if not account:
        raise BridgeInputError("请先配置个人考勤账号。")
    raw_row = dict(settings["row"]) if isinstance(settings["row"], dict) else settings["row"]
    if isinstance(raw_row, dict):
        raw_row["account"] = account
    patch = parse_roster_patch(raw_row)
    records = read_roster_records()
    matches = [(record_id, row) for record_id, row in records if normalize_account(row.get("account")) == account]
    if len(matches) > 1:
        raise BridgeInputError("花名册中存在多行相同个人账号，请先在管理版合并。")
    record_id, source = matches[0] if matches else (None, {})
    merged = {key: str(patch.get(key, source.get(key, ""))) for key, _, _ in ROSTER_FIELDS}
    merged["account"] = account
    if matches:
        rows = [(existing_id, merged if existing_id == record_id else row) for existing_id, row in records]
    else:
        rows = [*records, (None, merged)]
    write_roster_rows(rows)
    return personal_roster_view()


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
            raise BridgeInputError("密码写入插件本地数据库失败。")
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


def update_personal_account(settings: dict[str, Any]) -> dict[str, Any]:
    if set(settings) != {"account"} or not isinstance(settings.get("account"), str):
        raise BridgeInputError("个人版只接受一个账号字段。")
    account = normalize_account(settings["account"])
    if not account:
        raise BridgeInputError("请填写个人考勤账号。")
    if len(account) > 100 or not re.fullmatch(r"[A-Za-z0-9_.@-]+", account):
        raise BridgeInputError("个人账号只能包含字母、数字及 . _ @ -。")
    ensure_plugin_database()
    connection = database_connection()
    try:
        set_database_setting(connection, "personal-account", account)
        connection.commit()
    finally:
        connection.close()
    return personal_attendance()


def normalize_account(value: Any) -> str:
    account = str(value or "").strip()
    return account[:-2] if account.endswith(".0") else account


def personal_account() -> str:
    ensure_plugin_database()
    connection = database_connection()
    try:
        return normalize_account(database_setting(connection, "personal-account"))
    finally:
        connection.close()


def personal_schedule_settings() -> tuple[bool, list[str]]:
    ensure_plugin_database()
    connection = database_connection()
    try:
        enabled = database_setting(connection, "personal-schedule-enabled") == "1"
        try:
            raw_times = json.loads(database_setting(connection, "personal-schedule-times", "[]"))
        except json.JSONDecodeError:
            raw_times = []
        times = [str(value) for value in raw_times if re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", str(value))][:4] if isinstance(raw_times, list) else []
        return enabled, times
    finally:
        connection.close()


REMINDER_TYPES = {"missing-clock-in", "missing-clock-out", "makeup-window", "night-safety", "sync-failed"}
REMINDER_CHANNELS = {"pet", "desktop", "plugin"}


def personal_reminder_settings() -> dict[str, Any]:
    ensure_plugin_database()
    connection = database_connection()
    try:
        row = connection.execute(
            "SELECT startup_inspection, use_pet, fallback_notification, night_safety, shift_type "
            "FROM personal_reminder_settings WHERE singleton = 1"
        ).fetchone()
        return {
            "startupInspection": bool(row["startup_inspection"]),
            "usePet": bool(row["use_pet"]),
            "fallbackNotification": bool(row["fallback_notification"]),
            "nightSafety": bool(row["night_safety"]),
            "shiftType": str(row["shift_type"]),
        }
    finally:
        connection.close()


def update_personal_reminder_settings(settings: dict[str, Any]) -> dict[str, Any]:
    expected = {"startupInspection", "usePet", "fallbackNotification", "nightSafety", "shiftType"}
    if set(settings) != expected:
        raise BridgeInputError("个人提醒配置格式无效。")
    if any(not isinstance(settings[key], bool) for key in expected - {"shiftType"}):
        raise BridgeInputError("个人提醒开关必须为布尔值。")
    if settings["shiftType"] not in {"day", "night", "flexible", "off"}:
        raise BridgeInputError("个人班次类型无效。")
    if settings["startupInspection"]:
        ensure_personal_run_ready()
    ensure_plugin_database()
    connection = database_connection()
    try:
        connection.execute(
            """UPDATE personal_reminder_settings SET startup_inspection = ?, use_pet = ?,
            fallback_notification = ?, night_safety = ?, shift_type = ? WHERE singleton = 1""",
            (int(settings["startupInspection"]), int(settings["usePet"]),
             int(settings["fallbackNotification"]), int(settings["nightSafety"]), settings["shiftType"]),
        )
        connection.commit()
    finally:
        connection.close()
    return personal_automation_view()


def parse_iso_datetime(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or len(value) > 40:
        raise BridgeInputError(f"{field} 格式无效。")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        # Node serializes Date values as UTC (`...Z`).  All persisted bridge
        # timestamps are local naive values, so convert the instant to the
        # machine timezone before removing tzinfo; simply stripping `Z` makes
        # a future event look eight hours old on an Asia/Shanghai desktop.
        return parsed.astimezone().replace(tzinfo=None) if parsed.tzinfo is not None else parsed
    except ValueError as exc:
        raise BridgeInputError(f"{field} 格式无效。") from exc


def reserve_personal_reminder_delivery(settings: dict[str, Any]) -> dict[str, Any]:
    expected = {"eventId", "attendanceDate", "type", "channel", "expiresAt"}
    if set(settings) != expected or not all(isinstance(settings.get(key), str) for key in expected):
        raise BridgeInputError("提醒投递请求格式无效。")
    event_id = settings["eventId"].strip()
    attendance_date = settings["attendanceDate"].strip()
    reminder_type = settings["type"]
    channel = settings["channel"]
    if not re.fullmatch(r"[A-Za-z0-9-]{12,100}", event_id):
        raise BridgeInputError("提醒事件标识无效。")
    try:
        datetime.strptime(attendance_date, "%Y-%m-%d")
    except ValueError as exc:
        raise BridgeInputError("提醒考勤日期无效。") from exc
    if reminder_type not in REMINDER_TYPES or channel not in REMINDER_CHANNELS:
        raise BridgeInputError("提醒类型或投递渠道无效。")
    expires_at = parse_iso_datetime(settings["expiresAt"], "提醒过期时间")
    now = current_local_datetime()
    if expires_at <= now or expires_at > now + timedelta(days=7):
        raise BridgeInputError("提醒过期时间无效。")
    account = personal_account()
    if not account:
        raise BridgeInputError("请先配置个人考勤账号。")
    account_hash = hashlib.sha256(account.encode("utf-8")).hexdigest()
    cutoff = (now - timedelta(hours=6)).isoformat(timespec="seconds")
    ensure_plugin_database()
    connection = database_connection()
    try:
        connection.execute("DELETE FROM personal_reminder_delivery WHERE expires_at < ?", (now.isoformat(timespec="seconds"),))
        duplicate = connection.execute(
            """SELECT event_id FROM personal_reminder_delivery
            WHERE account_hash = ? AND attendance_date = ? AND reminder_type = ?
              AND status IN ('pending', 'delivered') AND created_at >= ?
            ORDER BY created_at DESC LIMIT 1""",
            (account_hash, attendance_date, reminder_type, cutoff),
        ).fetchone()
        if duplicate is not None:
            connection.commit()
            return {"allowed": False, "duplicateOf": str(duplicate["event_id"])}
        created_at = now.isoformat(timespec="seconds")
        connection.execute(
            """INSERT INTO personal_reminder_delivery
            (event_id, account_hash, attendance_date, reminder_type, channel, status, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)""",
            (event_id, account_hash, attendance_date, reminder_type, channel, created_at, expires_at.isoformat(timespec="seconds")),
        )
        connection.commit()
        return {"allowed": True}
    finally:
        connection.close()


def complete_personal_reminder_delivery(settings: dict[str, Any]) -> dict[str, Any]:
    if set(settings) != {"eventId", "channel", "status"} or settings.get("channel") not in REMINDER_CHANNELS or settings.get("status") not in {"delivered", "failed"}:
        raise BridgeInputError("提醒投递结果格式无效。")
    event_id = str(settings.get("eventId", "")).strip()
    if not re.fullmatch(r"[A-Za-z0-9-]{12,100}", event_id):
        raise BridgeInputError("提醒事件标识无效。")
    ensure_plugin_database()
    connection = database_connection()
    try:
        cursor = connection.execute(
            "UPDATE personal_reminder_delivery SET channel = ?, status = ?, delivered_at = ? WHERE event_id = ?",
            (settings["channel"], settings["status"], datetime.now().isoformat(timespec="seconds"), event_id),
        )
        if cursor.rowcount != 1:
            raise BridgeInputError("提醒事件不存在。")
        connection.commit()
        return {"ok": True}
    finally:
        connection.close()


def claim_personal_startup(settings: dict[str, Any]) -> dict[str, Any]:
    if set(settings) != {"attendanceDate"} or not isinstance(settings.get("attendanceDate"), str):
        raise BridgeInputError("启动巡检请求格式无效。")
    attendance_date = settings["attendanceDate"]
    try:
        datetime.strptime(attendance_date, "%Y-%m-%d")
    except ValueError as exc:
        raise BridgeInputError("启动巡检日期无效。") from exc
    account = personal_account()
    if not account:
        return {"claimed": False}
    account_hash = hashlib.sha256(account.encode("utf-8")).hexdigest()
    ensure_plugin_database()
    connection = database_connection()
    try:
        cursor = connection.execute(
            "INSERT OR IGNORE INTO personal_startup_run (account_hash, attendance_date, claimed_at) VALUES (?, ?, ?)",
            (account_hash, attendance_date, datetime.now().isoformat(timespec="seconds")),
        )
        connection.execute("DELETE FROM personal_startup_run WHERE attendance_date < ?", ((date.today() - timedelta(days=30)).isoformat(),))
        connection.commit()
        return {"claimed": cursor.rowcount == 1}
    finally:
        connection.close()


def last_personal_reminder_delivery() -> dict[str, Any] | None:
    account = personal_account()
    if not account:
        return None
    ensure_plugin_database()
    connection = database_connection()
    try:
        row = connection.execute(
            """SELECT event_id, reminder_type, channel, status, delivered_at, created_at
            FROM personal_reminder_delivery WHERE account_hash = ?
            ORDER BY created_at DESC LIMIT 1""",
            (hashlib.sha256(account.encode("utf-8")).hexdigest(),),
        ).fetchone()
        if row is None:
            return None
        return {"eventId": str(row["event_id"]), "type": str(row["reminder_type"]),
                "channel": str(row["channel"]), "status": str(row["status"]),
                "deliveredAt": str(row["delivered_at"] or row["created_at"])}
    finally:
        connection.close()


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


def personal_record_from_latest(username: str) -> dict[str, Any] | None:
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
    if is_late_night_completion(clock_in, clock_out):
        # A 23:30-23:59 same-day checkout closes the day as normal attendance.
        state = "normal"
    elif "迟到" in status_text:
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


def migrate_legacy_personal_history(connection: sqlite3.Connection) -> None:
    if database_setting(connection, "legacy-personal-history-import-v1"):
        return
    try:
        value = json.loads(PERSONAL_HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        value = {}
    if isinstance(value, dict) and isinstance(value.get("accountHash"), str):
        records = value.get("records") if isinstance(value.get("records"), list) else []
        for item in records:
            record = sanitize_personal_record(item)
            if record is not None:
                connection.execute(
                    """INSERT INTO personal_history (account_hash, attendance_date, clock_in, clock_out, work_minutes, status)
                    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(account_hash, attendance_date) DO UPDATE SET
                    clock_in = excluded.clock_in, clock_out = excluded.clock_out,
                    work_minutes = excluded.work_minutes, status = excluded.status""",
                    (value["accountHash"], record["date"], record["clockIn"], record["clockOut"], record["workMinutes"], record["status"]),
                )
    set_database_setting(connection, "legacy-personal-history-import-v1", datetime.now().isoformat(timespec="seconds"))


def read_personal_history(account_hash: str) -> list[dict[str, Any]]:
    ensure_plugin_database()
    connection = database_connection()
    try:
        migrate_legacy_personal_history(connection)
        rows = connection.execute(
            """SELECT attendance_date, clock_in, clock_out, work_minutes, status FROM personal_history
            WHERE account_hash = ? ORDER BY attendance_date""",
            (account_hash,),
        ).fetchall()
        connection.commit()
        return [{
            "date": str(row["attendance_date"]), "clockIn": str(row["clock_in"]),
            "clockOut": str(row["clock_out"]), "workMinutes": row["work_minutes"], "status": str(row["status"]),
        } for row in rows]
    finally:
        connection.close()


def write_personal_history(account_hash: str, records: list[dict[str, Any]]) -> None:
    ensure_plugin_database()
    connection = database_connection()
    try:
        connection.execute("DELETE FROM personal_history WHERE account_hash = ?", (account_hash,))
        connection.executemany(
            """INSERT INTO personal_history (account_hash, attendance_date, clock_in, clock_out, work_minutes, status)
            VALUES (?, ?, ?, ?, ?, ?)""",
            [(account_hash, item["date"], item["clockIn"], item["clockOut"], item["workMinutes"], item["status"]) for item in records],
        )
        connection.commit()
    finally:
        connection.close()


def apply_late_night_completion(record: dict[str, Any]) -> dict[str, Any]:
    """Correct previously cached short-hour records when the late-night rule applies."""
    if is_late_night_completion(str(record.get("clockIn", "")), str(record.get("clockOut", ""))):
        return {**record, "status": "normal"}
    return record


def personal_attendance() -> dict[str, Any]:
    import keyring_utils
    username = personal_account()
    if not username:
        return {"configured": False, "accountMasked": "", "records": [], "calendar": personal_work_calendar([]), "source": {"latestAvailable": LAST_DATA_FILE.exists(), "historyDays": 0}}
    account_hash = hashlib.sha256(username.encode("utf-8")).hexdigest()
    stored_records = read_personal_history(account_hash)
    records = [apply_late_night_completion(record) for record in stored_records]
    if records != stored_records:
        write_personal_history(account_hash, records)
    latest = personal_record_from_latest(username)
    if latest is not None:
        by_date = {str(item["date"]): item for item in records}
        by_date[latest["date"]] = latest
        records = sorted(by_date.values(), key=lambda item: item["date"])[-400:]
        write_personal_history(account_hash, records)
    with redirect_stdout(sys.stderr):
        masked = keyring_utils.mask_account(username)
    return {
        "configured": True, "accountMasked": masked, "records": records,
        "calendar": personal_work_calendar(records),
        "source": {"latestAvailable": bool(records), "historyDays": len(records)},
    }


def current_local_datetime() -> datetime:
    """Use the machine's local time; the override exists only for bridge tests."""
    test_value = os.environ.get("IEPMS_BRIDGE_TEST_NOW", "")
    if test_value:
        try:
            parsed = datetime.fromisoformat(test_value.replace("Z", "+00:00"))
            return parsed.astimezone().replace(tzinfo=None) if parsed.tzinfo is not None else parsed
        except ValueError:
            pass
    return datetime.now()


def parse_iso_date(value: Any, label: str) -> date:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise BridgeInputError(f"{label}必须使用 YYYY-MM-DD 格式。")
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise BridgeInputError(f"{label}无效。") from exc


def makeup_deadline(attendance_date: str) -> datetime:
    # The stated policy treats the missed day as day one: a Monday record is
    # eligible through Wednesday 23:59:59.999999 local time.
    missed = parse_iso_date(attendance_date, "缺卡日期")
    return datetime.combine(missed, datetime.min.time()) + timedelta(days=3) - timedelta(microseconds=1)


def is_non_working_day(value: date) -> bool:
    try:
        import chinese_calendar
        return not chinese_calendar.is_workday(value)
    except Exception:
        # The legacy backend declares chinese-calendar as a dependency. If an
        # incomplete local installation is missing it, retain a conservative,
        # deterministic weekend fallback instead of accepting a weekday.
        return value.weekday() >= 5


def personal_work_calendar(records: list[dict[str, Any]]) -> dict[str, list[str]]:
    """Return official workdays for every month represented in the personal view."""
    today = current_local_datetime().date()
    first_month = today.replace(day=1)
    for record in records:
        try:
            first_month = min(first_month, parse_iso_date(record.get("date"), "考勤日期").replace(day=1))
        except BridgeInputError:
            continue

    workdays: list[str] = []
    month = first_month
    current_month = today.replace(day=1)
    while month <= current_month:
        next_month = (month.replace(day=28) + timedelta(days=4)).replace(day=1)
        day = month
        while day < next_month:
            if not is_non_working_day(day):
                workdays.append(day.isoformat())
            day += timedelta(days=1)
        month = next_month
    return {"workdays": workdays}


def overtime_reminder_dates(deadline: datetime) -> list[str]:
    """Return the first continuous non-working period after a makeup window."""
    candidate = deadline.date() + timedelta(days=1)
    dates: list[str] = []
    for _ in range(21):
        if is_non_working_day(candidate):
            dates.append(candidate.isoformat())
        elif dates:
            break
        candidate += timedelta(days=1)
    return dates


def read_personal_makeup_requests(account_hash: str) -> dict[str, dict[str, Any]]:
    ensure_plugin_database()
    connection = database_connection()
    try:
        rows = connection.execute(
            """SELECT attendance_date, request_kind, overtime_date, reason, status, created_at
            FROM personal_makeup_requests WHERE account_hash = ? ORDER BY attendance_date DESC""",
            (account_hash,),
        ).fetchall()
        return {str(row["attendance_date"]): {
            "kind": str(row["request_kind"]), "overtimeDate": str(row["overtime_date"]),
            "reason": str(row["reason"]), "status": str(row["status"]), "createdAt": str(row["created_at"]),
        } for row in rows}
    finally:
        connection.close()


def personal_makeup_view() -> dict[str, Any]:
    attendance = personal_attendance()
    if not attendance["configured"]:
        return {"configured": False, "items": []}
    username = personal_account()
    account_hash = hashlib.sha256(username.encode("utf-8")).hexdigest()
    applications = read_personal_makeup_requests(account_hash)
    now = current_local_datetime()
    items = []
    for record in attendance["records"]:
        if record["status"] != "missing":
            continue
        deadline = makeup_deadline(record["date"])
        application = applications.get(record["date"])
        if application is not None:
            mode, message = "submitted", "已登记为本地待提交申请。"
        elif now <= deadline:
            mode, message = "makeup", f"可补卡至 {deadline.strftime('%m-%d %H:%M')}。"
        else:
            mode, message = "overtime", "已超过补卡时限，仅可填写非工作日的加班补卡。"
        item: dict[str, Any] = {
            "attendanceDate": record["date"], "mode": mode,
            "deadline": deadline.strftime("%Y-%m-%d %H:%M"), "message": message,
            "overtimeReminderDates": overtime_reminder_dates(deadline),
        }
        if application is not None:
            item["application"] = application
        items.append(item)
    return {"configured": True, "items": sorted(items, key=lambda item: str(item["attendanceDate"]), reverse=True)}


def submit_personal_makeup(settings: dict[str, Any]) -> dict[str, Any]:
    allowed = {"attendanceDate", "overtimeDate", "reason"}
    if set(settings) - allowed or not isinstance(settings.get("attendanceDate"), str):
        raise BridgeInputError("补卡申请格式无效。")
    attendance_date = parse_iso_date(settings["attendanceDate"], "缺卡日期").isoformat()
    overtime_raw = settings.get("overtimeDate", "")
    reason_raw = settings.get("reason", "")
    if not isinstance(overtime_raw, str) or not isinstance(reason_raw, str):
        raise BridgeInputError("补卡申请格式无效。")
    reason = reason_raw.strip()
    if len(reason) > 300:
        raise BridgeInputError("补卡说明不能超过 300 个字符。")
    username = personal_account()
    if not username:
        raise BridgeInputError("请先配置个人考勤账号。")
    account_hash = hashlib.sha256(username.encode("utf-8")).hexdigest()
    records = {record["date"]: record for record in read_personal_history(account_hash)}
    latest = personal_record_from_latest(username)
    if latest is not None:
        records[latest["date"]] = latest
    if records.get(attendance_date, {}).get("status") != "missing":
        raise BridgeInputError("只能为当前缺卡记录申请补卡。")
    deadline = makeup_deadline(attendance_date)
    now = current_local_datetime()
    kind = "makeup"
    overtime_date = ""
    if now <= deadline:
        if overtime_raw.strip():
            raise BridgeInputError("72 小时内请直接申请补卡，不需要填写加班日期。")
    else:
        kind = "overtime"
        overtime_day = parse_iso_date(overtime_raw.strip(), "加班日期")
        if overtime_day > now.date():
            raise BridgeInputError("加班日期不能晚于今天。")
        if not is_non_working_day(overtime_day):
            raise BridgeInputError("超过 72 小时后，仅可选择非工作日申请加班补卡。")
        overtime_date = overtime_day.isoformat()
    ensure_plugin_database()
    connection = database_connection()
    try:
        existing = connection.execute(
            "SELECT 1 FROM personal_makeup_requests WHERE account_hash = ? AND attendance_date = ?",
            (account_hash, attendance_date),
        ).fetchone()
        if existing is not None:
            raise BridgeInputError("该缺卡记录已有本地待提交申请。")
        timestamp = now.isoformat(timespec="seconds")
        connection.execute(
            """INSERT INTO personal_makeup_requests (
                account_hash, attendance_date, request_kind, overtime_date, reason, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'local-pending', ?, ?)""",
            (account_hash, attendance_date, kind, overtime_date, reason, timestamp, timestamp),
        )
        connection.commit()
    finally:
        connection.close()
    return personal_makeup_view()


def management_record_key(account: str) -> str:
    """Return a non-reversible, stable identifier for a roster account."""
    return hashlib.sha256(account.encode("utf-8")).hexdigest()


def normalize_management_record(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    account = normalize_account(value.get("account"))
    record = sanitize_personal_record({
        "date": value.get("date"), "clockIn": value.get("clockIn"),
        "clockOut": value.get("clockOut"), "workMinutes": value.get("workMinutes"),
        "status": value.get("status"),
    })
    return {"account": account, **record} if account and record is not None else None


def import_management_attendance_sync() -> int:
    """Upsert the monitor's scoped local sync file into plugin-owned SQLite."""
    if not MANAGEMENT_SYNC_FILE.exists():
        return 0
    try:
        source = json.loads(MANAGEMENT_SYNC_FILE.read_text(encoding="utf-8"))
        values = source.get("records") if isinstance(source, dict) else None
    except Exception:
        return 0
    if not isinstance(values, list):
        return 0
    records = [record for item in values if (record := normalize_management_record(item)) is not None]
    if not records:
        return 0
    ensure_plugin_database()
    captured_at = str(source.get("capturedAt", "")).strip() if isinstance(source, dict) else ""
    captured_at = captured_at or datetime.now().isoformat(timespec="seconds")
    connection = database_connection()
    try:
        connection.executemany(
            """INSERT INTO management_attendance_history (
                account, attendance_date, clock_in, clock_out, work_minutes, status, captured_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(account, attendance_date) DO UPDATE SET
                clock_in = excluded.clock_in, clock_out = excluded.clock_out,
                work_minutes = excluded.work_minutes, status = excluded.status,
                captured_at = excluded.captured_at""",
            [(item["account"], item["date"], item["clockIn"], item["clockOut"], item["workMinutes"], item["status"], captured_at) for item in records],
        )
        connection.commit()
    finally:
        connection.close()
    return len(records)


def parse_management_analytics_settings(settings: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(settings, dict):
        raise BridgeInputError("考勤分析筛选条件无效。")
    allowed = {"month", "name", "group", "page", "pageSize", "sortBy", "sortDirection", "personKey"}
    if set(settings) - allowed:
        raise BridgeInputError("考勤分析筛选条件包含不支持的字段。")
    month = str(settings.get("month") or current_local_datetime().strftime("%Y-%m"))
    if not re.fullmatch(r"\d{4}-\d{2}", month):
        raise BridgeInputError("月份必须使用 YYYY-MM 格式。")
    try:
        datetime.strptime(month + "-01", "%Y-%m-%d")
    except ValueError as exc:
        raise BridgeInputError("月份无效。") from exc
    name = str(settings.get("name", "")).strip()
    group = str(settings.get("group", "")).strip()
    person_key = str(settings.get("personKey", "")).strip()
    if len(name) > 100 or len(group) > 100 or (person_key and not re.fullmatch(r"[0-9a-f]{64}", person_key)):
        raise BridgeInputError("考勤分析筛选条件无效。")
    page = settings.get("page", 1)
    page_size = settings.get("pageSize", 20)
    if not isinstance(page, int) or not 1 <= page <= 10000 or not isinstance(page_size, int) or not 1 <= page_size <= 2000:
        raise BridgeInputError("分页参数无效。")
    sort_by = str(settings.get("sortBy", "missing"))
    if sort_by not in {"name", "expected", "actual", "normal", "missing", "madeUp", "pending", "expired", "late", "early", "rate", "grade"}:
        raise BridgeInputError("排序字段无效。")
    direction = str(settings.get("sortDirection", "desc"))
    if direction not in {"asc", "desc"}:
        raise BridgeInputError("排序方向无效。")
    return {"month": month, "name": name, "group": group, "personKey": person_key, "page": page, "pageSize": page_size, "sortBy": sort_by, "sortDirection": direction}


def month_dates(month: str) -> list[date]:
    first = datetime.strptime(month + "-01", "%Y-%m-%d").date()
    next_month = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    days: list[date] = []
    day = first
    while day < next_month:
        days.append(day)
        day += timedelta(days=1)
    return days


def management_makeup_by_account(connection: sqlite3.Connection) -> dict[tuple[str, str], str]:
    rows = connection.execute("SELECT account_hash, attendance_date, status FROM personal_makeup_requests").fetchall()
    return {(str(row["account_hash"]), str(row["attendance_date"])): str(row["status"]) for row in rows}


def management_attendance_resolution(account: str, attendance_date: str, request_status: str, now: datetime) -> str:
    if request_status in {"approved", "completed", "made-up"}:
        return "made-up"
    if request_status:
        return "pending"
    return "pending" if now <= makeup_deadline(attendance_date) else "expired"


def management_analytics_read(settings: dict[str, Any]) -> dict[str, Any]:
    query = parse_management_analytics_settings(settings)
    import_management_attendance_sync()
    month = query["month"]
    today = current_local_datetime().date()
    all_month_days = month_dates(month)
    month_start, month_end = all_month_days[0].isoformat(), all_month_days[-1].isoformat()
    connection = database_connection()
    try:
        roster = connection.execute(
            """SELECT project_name, name, city, account FROM roster
            WHERE account <> '' ORDER BY display_order, id"""
        ).fetchall()
        history_rows = connection.execute(
            """SELECT account, attendance_date, clock_in, clock_out, work_minutes, status
            FROM management_attendance_history WHERE attendance_date BETWEEN ? AND ?""",
            (month_start, month_end),
        ).fetchall()
        makeup = management_makeup_by_account(connection)
    finally:
        connection.close()

    # A date is eligible for analysis only after a management sync observed it.
    # This prevents absent historical rows from being fabricated as missing cards.
    covered_dates = {str(row["attendance_date"]) for row in history_rows}
    expected_dates = [day.isoformat() for day in all_month_days if day <= today and not is_non_working_day(day) and day.isoformat() in covered_dates]
    histories: dict[str, dict[str, dict[str, Any]]] = {}
    for row in history_rows:
        histories.setdefault(str(row["account"]), {})[str(row["attendance_date"])] = {
            "date": str(row["attendance_date"]), "clockIn": str(row["clock_in"]), "clockOut": str(row["clock_out"]),
            "workMinutes": row["work_minutes"], "status": str(row["status"]),
        }
    people: list[dict[str, Any]] = []
    for roster_row in roster:
        account = str(roster_row["account"])
        record_map = histories.get(account, {})
        values = [record_map[day] for day in expected_dates if day in record_map]
        missing_records = [record for record in values if record["status"] == "missing"]
        resolutions = [management_attendance_resolution(account, record["date"], makeup.get((management_record_key(account), record["date"]), ""), current_local_datetime()) for record in missing_records]
        expected = len(expected_dates)
        actual = sum(1 for record in values if record["status"] != "missing")
        rate = round(actual * 100 / expected, 1) if expected else 0.0
        if not expected:
            grade = "暂无数据"
        elif rate >= 98 and not missing_records:
            grade = "优秀"
        elif rate >= 95:
            grade = "良好"
        elif rate >= 90:
            grade = "待关注"
        else:
            grade = "异常较多"
        people.append({
            "personKey": management_record_key(account), "name": str(roster_row["name"]),
            "group": str(roster_row["project_name"] or roster_row["city"]), "city": str(roster_row["city"]),
            "expectedDays": expected, "actualDays": actual,
            "normalCount": sum(1 for record in values if record["status"] == "normal"),
            "missingCount": len(missing_records), "madeUpCount": resolutions.count("made-up"),
            "pendingMakeupCount": resolutions.count("pending"), "expiredMissingCount": resolutions.count("expired"),
            "lateCount": sum(1 for record in values if record["status"] == "late"),
            "earlyCount": sum(1 for record in values if record["status"] == "early"),
            "attendanceRate": rate, "grade": grade,
        })

    name_filter, group_filter = query["name"].lower(), query["group"].lower()
    filtered = [item for item in people if (not name_filter or name_filter in item["name"].lower()) and (not group_filter or group_filter in item["group"].lower() or group_filter in item["city"].lower())]
    sort_fields = {"name": "name", "expected": "expectedDays", "actual": "actualDays", "normal": "normalCount", "missing": "missingCount", "madeUp": "madeUpCount", "pending": "pendingMakeupCount", "expired": "expiredMissingCount", "late": "lateCount", "early": "earlyCount", "rate": "attendanceRate", "grade": "grade"}
    filtered.sort(key=lambda item: (item[sort_fields[query["sortBy"]]], item["name"]), reverse=query["sortDirection"] == "desc")
    start = (query["page"] - 1) * query["pageSize"]
    paged = filtered[start:start + query["pageSize"]]
    grade_order = ("优秀", "良好", "待关注", "异常较多")
    trend = []
    for day in expected_dates:
        day_missing = 0
        day_pending = 0
        for person in people:
            record = histories.get(next((str(row["account"]) for row in roster if management_record_key(str(row["account"])) == person["personKey"]), ""), {}).get(day)
            if record is not None and record["status"] == "missing":
                day_missing += 1
                if management_attendance_resolution("", day, "", current_local_datetime()) == "pending":
                    day_pending += 1
        trend.append({"date": day, "missingCount": day_missing, "pendingCount": day_pending})
    total_expected = sum(item["expectedDays"] for item in people)
    total_actual = sum(item["actualDays"] for item in people)
    return {
        "month": month, "coverage": {"coveredWorkdays": len(expected_dates), "firstDate": expected_dates[0] if expected_dates else "", "lastDate": expected_dates[-1] if expected_dates else ""},
        "metrics": {"personCount": len(people), "attendanceRate": round(total_actual * 100 / total_expected, 1) if total_expected else 0.0, "missingCount": sum(item["missingCount"] for item in people), "pendingMakeupCount": sum(item["pendingMakeupCount"] for item in people)},
        "trend": trend,
        "ranking": sorted(([{"name": item["name"], "group": item["group"], "missingCount": item["missingCount"]} for item in people]), key=lambda item: (-item["missingCount"], item["name"]))[:10],
        "gradeDistribution": [{"grade": grade, "count": sum(1 for item in people if item["grade"] == grade)} for grade in grade_order],
        "groups": sorted({item["group"] for item in people if item["group"]}),
        "pagination": {"page": query["page"], "pageSize": query["pageSize"], "total": len(filtered)}, "rows": paged,
    }


def management_analytics_person_read(settings: dict[str, Any]) -> dict[str, Any]:
    query = parse_management_analytics_settings(settings)
    if not query["personKey"]:
        raise BridgeInputError("请选择要查看的人员。")
    overview = management_analytics_read({**query, "page": 1, "pageSize": 2000, "name": "", "group": ""})
    person = next((item for item in overview["rows"] if item["personKey"] == query["personKey"]), None)
    if person is None:
        raise BridgeInputError("未找到该人员的考勤数据。")
    connection = database_connection()
    try:
        roster = connection.execute("SELECT account FROM roster WHERE account <> ''").fetchall()
        account = next((str(row["account"]) for row in roster if management_record_key(str(row["account"])) == query["personKey"]), "")
        history = connection.execute("""SELECT attendance_date, clock_in, clock_out, work_minutes, status FROM management_attendance_history
            WHERE account = ? AND attendance_date LIKE ? ORDER BY attendance_date""", (account, query["month"] + "%")).fetchall()
        makeup = management_makeup_by_account(connection)
    finally:
        connection.close()
    records = []
    for row in history:
        item = {"date": str(row["attendance_date"]), "clockIn": str(row["clock_in"]), "clockOut": str(row["clock_out"]), "workMinutes": row["work_minutes"], "status": str(row["status"])}
        if item["status"] == "missing":
            item["resolution"] = management_attendance_resolution(account, item["date"], makeup.get((query["personKey"], item["date"]), ""), current_local_datetime())
        records.append(item)
    return {"month": query["month"], "person": person, "records": records, "anomalies": [item for item in records if item["status"] != "normal"]}


def process_is_running(pid: Any) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        if os.name == "nt":
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", f"Get-Process -Id {pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"],
                capture_output=True, text=True, timeout=3,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
            )
            return result.returncode == 0 and result.stdout.strip() == str(pid)
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def read_personal_run_state() -> dict[str, Any]:
    ensure_plugin_database()
    connection = database_connection()
    try:
        row = connection.execute("SELECT state, pid, started_at, completed_at, message FROM personal_run_state WHERE singleton = 1").fetchone()
        if row is None:
            try:
                legacy = json.loads(PERSONAL_RUN_FILE.read_text(encoding="utf-8"))
            except Exception:
                legacy = {}
            value = legacy if isinstance(legacy, dict) else {}
            connection.execute(
                "INSERT INTO personal_run_state (singleton, state, pid, started_at, completed_at, message) VALUES (1, ?, ?, ?, ?, ?)",
                (str(value.get("state", "idle")), value.get("pid"), str(value.get("startedAt", "")), str(value.get("completedAt", "")), str(value.get("message", ""))),
            )
            connection.commit()
        else:
            value = {"state": row["state"], "pid": row["pid"], "startedAt": row["started_at"], "completedAt": row["completed_at"], "message": row["message"]}
    finally:
        connection.close()
    state = str(value.get("state", "idle"))
    if state not in {"idle", "running", "success", "error"}:
        state = "idle"
    pid = value.get("pid")
    if state == "running" and not process_is_running(pid):
        state = "error"
        value["message"] = "上次个人巡检意外中止。"
        value["completedAt"] = datetime.now().isoformat(timespec="seconds")
        value["pid"] = None
        value["state"] = state
        write_personal_run_state(value)
    return {
        "state": state,
        "lastRunAt": str(value.get("startedAt", ""))[:19],
        "lastCompletedAt": str(value.get("completedAt", ""))[:19],
        "message": str(value.get("message", ""))[:160],
    }


def write_personal_run_state(value: dict[str, Any]) -> None:
    ensure_plugin_database()
    connection = database_connection()
    try:
        connection.execute(
            """INSERT INTO personal_run_state (singleton, state, pid, started_at, completed_at, message)
            VALUES (1, ?, ?, ?, ?, ?) ON CONFLICT(singleton) DO UPDATE SET
            state = excluded.state, pid = excluded.pid, started_at = excluded.started_at,
            completed_at = excluded.completed_at, message = excluded.message""",
            (str(value.get("state", "idle")), value.get("pid"), str(value.get("startedAt", "")), str(value.get("completedAt", "")), str(value.get("message", ""))),
        )
        connection.commit()
    finally:
        connection.close()


def personal_login_ready(config: dict[str, Any]) -> bool:
    import keyring_utils
    username = normalize_account(config.get("username"))
    if not username:
        return False
    with redirect_stdout(sys.stderr):
        return bool(keyring_utils.get_password(username))


def personal_automation_view() -> dict[str, Any]:
    config, valid = read_config()
    config = ensure_default_credentials(config, valid)
    configured_account = personal_account()
    enabled, times = personal_schedule_settings()
    return {
        **read_personal_run_state(),
        "accountConfigured": bool(configured_account),
        "loginReady": personal_login_ready(config) if valid else False,
        "schedule": {"enabled": enabled, "times": times},
        "reminders": personal_reminder_settings(),
        "lastReminder": last_personal_reminder_delivery(),
    }


def ensure_personal_run_ready() -> tuple[dict[str, Any], str]:
    config, valid = read_config()
    config = ensure_default_credentials(config, valid)
    if not valid:
        raise BridgeInputError("请先完成本地配置。")
    account = personal_account()
    if not account:
        raise BridgeInputError("请先配置个人考勤账号。")
    if not personal_login_ready(config):
        raise BridgeInputError("请先在管理版配置可用的 iEPMS 登录账号和密码。")
    if not any(normalize_account(row.get("account")) == account for row in read_roster_rows()):
        raise BridgeInputError("个人账号不在本地花名册中。")
    return config, account


def start_personal_run(settings: dict[str, Any]) -> dict[str, Any]:
    if settings:
        raise BridgeInputError("立即巡检不接受额外参数。")
    ensure_personal_run_ready()
    current = read_personal_run_state()
    if current["state"] == "running":
        raise BridgeInputError("个人巡检正在执行，请等待完成。")
    started_at = datetime.now().isoformat(timespec="seconds")
    write_personal_run_state({"state": "running", "pid": None, "startedAt": started_at, "completedAt": "", "message": "正在启动个人巡检…"})
    bridge_path = Path(__file__).resolve()
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    if os.name == "nt":
        flags |= getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    try:
        child = subprocess.Popen(
            [sys.executable, str(bridge_path), "--personal-run"], cwd=str(DATA_ROOT),
            env={**os.environ, "IEPMS_PLUGIN_DATA_ROOT": str(DATA_ROOT), "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"},
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=flags,
        )
    except Exception as exc:
        write_personal_run_state({"state": "error", "pid": None, "startedAt": started_at, "completedAt": datetime.now().isoformat(timespec="seconds"), "message": "个人巡检启动失败。"})
        raise BridgeInputError("个人巡检启动失败。") from exc
    write_personal_run_state({"state": "running", "pid": child.pid, "startedAt": started_at, "completedAt": "", "message": "正在同步个人考勤记录…"})
    return personal_automation_view()


def read_management_run_state() -> dict[str, Any]:
    ensure_plugin_database()
    connection = database_connection()
    try:
        row = connection.execute("SELECT state, pid, started_at, completed_at, message FROM management_run_state WHERE singleton = 1").fetchone()
        if row is None:
            return {"state": "idle", "lastRunAt": "", "lastCompletedAt": "", "message": "尚未执行管理巡检。"}
        return {"state": row["state"], "lastRunAt": row["started_at"], "lastCompletedAt": row["completed_at"], "message": row["message"]}
    finally:
        connection.close()


def write_management_run_state(value: dict[str, Any]) -> None:
    ensure_plugin_database()
    connection = database_connection()
    try:
        connection.execute(
            """INSERT INTO management_run_state (singleton, state, pid, started_at, completed_at, message)
               VALUES (1, ?, ?, ?, ?, ?)
               ON CONFLICT(singleton) DO UPDATE SET state = excluded.state, pid = excluded.pid,
               started_at = excluded.started_at, completed_at = excluded.completed_at, message = excluded.message""",
            (value["state"], value.get("pid"), value["startedAt"], value.get("completedAt", ""), value["message"]),
        )
        connection.commit()
    finally:
        connection.close()


def management_log() -> list[str]:
    if not LOG_FILE.exists():
        return []
    try:
        return [redact(line) for line in LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines()[-200:]]
    except Exception:
        return []


def start_management_run(settings: dict[str, Any]) -> dict[str, Any]:
    if settings:
        raise BridgeInputError("管理巡检不接受额外参数。")
    current = read_management_run_state()
    if current["state"] == "running":
        raise BridgeInputError("管理巡检正在执行，请等待完成。")
    started_at = datetime.now().isoformat(timespec="seconds")
    bridge_path = Path(__file__).resolve()
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    if os.name == "nt":
        flags |= getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    try:
        child = subprocess.Popen(
            [sys.executable, str(bridge_path), "--management-run"], cwd=str(DATA_ROOT),
            env={**os.environ, "IEPMS_PLUGIN_DATA_ROOT": str(DATA_ROOT), "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"},
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags,
        )
    except Exception as exc:
        write_management_run_state({"state": "error", "pid": None, "startedAt": started_at, "completedAt": datetime.now().isoformat(timespec="seconds"), "message": "管理巡检启动失败。"})
        raise BridgeInputError("管理巡检启动失败。") from exc
    write_management_run_state({"state": "running", "pid": child.pid, "startedAt": started_at, "completedAt": "", "message": "管理巡检正在执行，可能登录 iEPMS 并发送已配置通知。"})
    return read_management_run_state()


def run_management_inspection() -> int:
    started_at = datetime.now().isoformat(timespec="seconds")
    try:
        config, valid = read_config()
        ensure_default_credentials(config, valid)
        import iepms_attendance_monitor as monitor
        monitor.main()
        imported = import_management_attendance_sync()
        write_management_run_state({"state": "success", "pid": None, "startedAt": started_at, "completedAt": datetime.now().isoformat(timespec="seconds"), "message": "管理巡检已结束，请查看运行日志确认结果。"})
        if imported:
            with LOG_FILE.open("a", encoding="utf-8") as stream:
                stream.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [信息] 已同步 {imported} 条考勤分析记录。\n")
        return 0
    except Exception as exc:
        detail = redact(str(exc)) or "未知错误"
        try:
            with LOG_FILE.open("a", encoding="utf-8") as stream:
                stream.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [错误] 管理巡检启动失败: {detail}\\n")
        except Exception:
            pass
        write_management_run_state({"state": "error", "pid": None, "startedAt": started_at, "completedAt": datetime.now().isoformat(timespec="seconds"), "message": f"管理巡检失败：{detail}"})
        return 1


def parse_personal_schedule_update(settings: dict[str, Any]) -> tuple[bool, list[str]]:
    if set(settings) != {"enabled", "times"} or not isinstance(settings.get("enabled"), bool) or not isinstance(settings.get("times"), list):
        raise BridgeInputError("个人定时配置格式无效。")
    raw_times = settings["times"]
    if len(raw_times) > 4 or any(not isinstance(value, str) for value in raw_times):
        raise BridgeInputError("个人巡检时间最多配置 4 个。")
    times = list(dict.fromkeys(value.strip() for value in raw_times))
    if any(re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value) is None for value in times):
        raise BridgeInputError("巡检时间必须使用 HH:MM 格式。")
    if settings["enabled"] and not times:
        raise BridgeInputError("启用定时巡检时至少需要一个时间。")
    return settings["enabled"], times


def powershell_quote(value: Any) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def update_personal_schedule(settings: dict[str, Any]) -> dict[str, Any]:
    if os.name != "nt":
        raise BridgeInputError("个人定时巡检仅支持 Windows。")
    enabled, times = parse_personal_schedule_update(settings)
    if enabled:
        config, _ = ensure_personal_run_ready()
    else:
        config, valid = read_config()
        if CONFIG_FILE.exists() and not valid:
            raise BridgeInputError("本地配置无效。")
    bridge_path = Path(__file__).resolve()
    lines = ["$ErrorActionPreference = 'Stop'"]
    if enabled:
        lines.extend([
            "$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name",
            "$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive",
            "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)",
            "$settings.StartWhenAvailable = $false",
        ])
        argument = f'"{bridge_path}" --personal-run'
        task_names = []
        for index, task_time in enumerate(times, 1):
            task_name = f"{PERSONAL_TASK_PREFIX}{index}"
            task_names.append(task_name)
            lines.extend([
                f"$action = New-ScheduledTaskAction -Execute {powershell_quote(sys.executable)} -Argument {powershell_quote(argument)} -WorkingDirectory {powershell_quote(DATA_ROOT)}",
                f"$trigger = New-ScheduledTaskTrigger -Daily -At {powershell_quote(task_time)}",
                f"Register-ScheduledTask -TaskName {powershell_quote(task_name)} -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null",
            ])
        keep = ",".join(powershell_quote(name) for name in task_names)
        lines.extend([
            f"$keep = @({keep})",
            f"Get-ScheduledTask -TaskName {powershell_quote(PERSONAL_TASK_PREFIX + '*')} -ErrorAction SilentlyContinue | Where-Object {{ $_.TaskName -notin $keep }} | Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue",
        ])
    else:
        lines.append(f"Get-ScheduledTask -TaskName {powershell_quote(PERSONAL_TASK_PREFIX + '*')} -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue")
    result = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "\n".join(lines)],
        capture_output=True, text=True, timeout=30,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
    )
    if result.returncode != 0:
        raise BridgeInputError("个人定时任务更新失败。")
    ensure_plugin_database()
    connection = database_connection()
    try:
        set_database_setting(connection, "personal-schedule-enabled", "1" if enabled else "0")
        set_database_setting(connection, "personal-schedule-times", json.dumps(times, ensure_ascii=False))
        connection.commit()
    finally:
        connection.close()
    return personal_automation_view()


def personal_records_from_api(records: list[dict[str, Any]], account: str) -> list[dict[str, Any]]:
    by_date: dict[str, list[datetime]] = {}
    for row in records:
        if not isinstance(row, dict) or normalize_account(row.get("账号")) != account:
            continue
        raw_time = str(row.get("考勤时间") or row.get("raw_time") or "").strip()
        parsed = None
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
            try:
                parsed = datetime.strptime(raw_time[:19], fmt)
                break
            except ValueError:
                continue
        if parsed is not None:
            by_date.setdefault(parsed.strftime("%Y-%m-%d"), []).append(parsed)
    result = []
    today = datetime.now().strftime("%Y-%m-%d")
    for day, values in sorted(by_date.items()):
        first, last = min(values), max(values)
        has_pair = last > first
        minutes = round((last - first).total_seconds() / 60) if has_pair else None
        late_night_completion = has_pair and is_late_night_completion(first.strftime("%H:%M"), last.strftime("%H:%M"))
        state = "normal" if late_night_completion or (has_pair and minutes is not None and minutes >= 480) else "early" if has_pair else "checked-in" if day == today else "missing"
        result.append({"date": day, "clockIn": first.strftime("%H:%M"), "clockOut": last.strftime("%H:%M") if has_pair else "", "workMinutes": minutes, "status": state})
    return result


def run_personal_inspection() -> int:
    started_at = datetime.now().isoformat(timespec="seconds")
    write_personal_run_state({"state": "running", "pid": os.getpid(), "startedAt": started_at, "completedAt": "", "message": "正在同步个人考勤记录…"})
    lock_handle = None
    browser = None
    context = None
    try:
        config, account = ensure_personal_run_ready()
        import keyring_utils  # noqa: F401 - validates the trusted local dependency before login.
        import iepms_attendance_monitor as monitor
        from playwright.sync_api import sync_playwright
        lock_handle = monitor.acquire_single_instance()
        if lock_handle is None:
            raise RuntimeError("已有巡检任务正在执行。")
        groups: dict[str, str | None] = {}
        for row in read_roster_rows():
            if normalize_account(row.get("account")) != account:
                continue
            project_name = str(row.get("projectName", "")).strip()
            if not project_name:
                continue
            project_code = str(row.get("projectCode", "")).strip().removesuffix(".0") or None
            groups[project_name] = project_code
        if not groups:
            raise RuntimeError("个人账号不在本地花名册中。")
        if not monitor.run_login():
            raise RuntimeError("iEPMS 登录失败。")
        cfg_t = config.get("timeouts") if isinstance(config.get("timeouts"), dict) else {}
        page_load_ms = int(cfg_t.get("page_load_ms", 60000))
        element_wait_ms = int(cfg_t.get("element_wait_ms", 30000))
        main_url = f"{str(config.get('iepms_host', 'https://iepms.zte.com.cn')).rstrip('/')}/zte-crm-iepms-baseui/#/main/mainPortal"
        collected: list[dict[str, Any]] = []
        with sync_playwright() as playwright:
            launch_kwargs: dict[str, Any] = {"headless": True, "args": ["--ignore-certificate-errors", "--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-gpu"]}
            browser_channel = str(config.get("browser_channel", "chrome")).strip()
            if browser_channel:
                launch_kwargs["channel"] = browser_channel
            browser = playwright.chromium.launch(**launch_kwargs)
            context = browser.new_context(storage_state=monitor.SESSION_FILE, viewport={"width": 1280, "height": 800})
            context.set_default_timeout(element_wait_ms)
            page = context.new_page()
            page.goto(main_url, wait_until="load", timeout=page_load_ms)
            start_date = (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d")
            today = datetime.now().strftime("%Y-%m-%d")
            for project_name, project_code in groups.items():
                result = monitor.fetch_attendance_api(page, project_name, start_date, today, config, project_code)
                if result is monitor.AUTH_EXPIRED or result is None:
                    raise RuntimeError("个人考勤数据读取失败。")
                collected.extend(result)
        fresh = personal_records_from_api(collected, account)
        account_hash = hashlib.sha256(account.encode("utf-8")).hexdigest()
        existing = read_personal_history(account_hash)
        merged = {str(item["date"]): item for item in existing}
        merged.update({str(item["date"]): item for item in fresh})
        records = sorted(merged.values(), key=lambda item: item["date"])[-400:]
        write_personal_history(account_hash, records)
        write_personal_run_state({"state": "success", "pid": None, "startedAt": started_at, "completedAt": datetime.now().isoformat(timespec="seconds"), "message": f"已同步 {len(fresh)} 天个人考勤记录。"})
        return 0
    except Exception as exc:
        message = str(exc)
        allowed = ("已有巡检任务正在执行", "个人账号不在本地花名册中", "iEPMS 登录失败", "个人考勤数据读取失败")
        safe_message = next((value for value in allowed if value in message), "个人巡检执行失败，请检查本地配置和运行日志。")
        write_personal_run_state({"state": "error", "pid": None, "startedAt": started_at, "completedAt": datetime.now().isoformat(timespec="seconds"), "message": safe_message})
        return 1
    finally:
        if context is not None:
            try:
                context.close()
            except Exception:
                pass
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
        if lock_handle is not None:
            try:
                lock_handle.close()
            except Exception:
                pass


def roster_summary() -> dict[str, Any]:
    rows = read_roster_rows()
    projects = {str(row.get("projectName", "")).strip() for row in rows if str(row.get("projectName", "")).strip()}
    people = {normalize_account(row.get("account")) for row in rows if normalize_account(row.get("account"))}
    anonymous = sum(1 for row in rows if not normalize_account(row.get("account")))
    return {"projectCount": len(projects), "personCount": len(people) + anonymous, "rosterAvailable": PLUGIN_DATABASE_FILE.exists()}


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
            "roster-read": roster_view,
            "personal-roster-read": personal_roster_view,
            "recent-runs": recent_runs,
            "schedule-status": schedule_status,
            "configuration-read": configuration_view,
            "personal-attendance": personal_attendance,
            "personal-automation-read": personal_automation_view,
            "personal-makeup-read": personal_makeup_view,
            "management-run-read": read_management_run_state,
            "management-log-read": management_log,
            "management-analytics-read": lambda: management_analytics_read(settings or {}),
            "management-analytics-person-read": lambda: management_analytics_person_read(settings or {}),
            "configuration-update": lambda: update_configuration(settings or {}),
            "roster-update": lambda: update_roster(settings or {}),
            "personal-roster-update": lambda: update_personal_roster(settings or {}),
            "personal-account-update": lambda: update_personal_account(settings or {}),
            "personal-run-start": lambda: start_personal_run(settings or {}),
            "personal-schedule-update": lambda: update_personal_schedule(settings or {}),
            "personal-reminder-settings-update": lambda: update_personal_reminder_settings(settings or {}),
            "personal-reminder-delivery-reserve": lambda: reserve_personal_reminder_delivery(settings or {}),
            "personal-reminder-delivery-complete": lambda: complete_personal_reminder_delivery(settings or {}),
            "personal-startup-claim": lambda: claim_personal_startup(settings or {}),
            "personal-makeup-submit": lambda: submit_personal_makeup(settings or {}),
            "management-run-start": lambda: start_management_run(settings or {}),
        }
        return emit(command, data=handlers[command]())
    except BridgeInputError as exc:
        return emit(command, error=("INVALID_CONFIGURATION", str(exc)))
    except Exception:
        return emit(command, error=("BRIDGE_FAILURE", "本地状态读取失败。"))


if __name__ == "__main__":
    raise SystemExit(run_personal_inspection() if "--personal-run" in sys.argv[1:] else run_management_inspection() if "--management-run" in sys.argv[1:] else main())

