# -*- coding: utf-8 -*-
"""Plugin-local account and password storage.

The desktop plugin stores credentials in its own SQLite database. Password
values are protected with Windows DPAPI and are never returned by bridge
responses or written to logs.
"""

from __future__ import annotations

import base64
import sqlite3
from datetime import datetime
from pathlib import Path

from plugin_paths import data_root


DATABASE_FILE = Path(data_root()) / "iepms-attendance-plugin.db"
PROTECTED_PREFIX = "dpapi:v1:"


def _connection() -> sqlite3.Connection:
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_FILE, timeout=10)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute(
        """CREATE TABLE IF NOT EXISTS plugin_credentials (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"""
    )
    return connection


def get_password(username: str) -> str | None:
    """Return a password only to the trusted local Python runtime."""
    if not username:
        return None
    connection = _connection()
    try:
        row = connection.execute(
            "SELECT password FROM plugin_credentials WHERE username = ?", (username,)
        ).fetchone()
        stored = str(row[0]) if row is not None else ""
    finally:
        connection.close()
    if not stored:
        return None
    if stored.startswith(PROTECTED_PREFIX):
        try:
            import win32crypt
            encrypted = base64.b64decode(stored[len(PROTECTED_PREFIX):].encode("ascii"), validate=True)
            return win32crypt.CryptUnprotectData(encrypted, None, None, None, 0)[1].decode("utf-8")
        except Exception:
            return None
    # Migrate credentials written by earlier plugin releases on their first use.
    set_password(username, stored)
    return stored


def set_password(username: str, password: str) -> bool:
    if not username or not password:
        return False
    try:
        import win32crypt
        encrypted = win32crypt.CryptProtectData(password.encode("utf-8"), "iEPMS attendance plugin", None, None, None, 0)
        stored = PROTECTED_PREFIX + base64.b64encode(encrypted).decode("ascii")
    except Exception:
        return False
    connection = _connection()
    try:
        connection.execute(
            """INSERT INTO plugin_credentials (username, password, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                password = excluded.password, updated_at = excluded.updated_at""",
            (username, stored, datetime.now().isoformat(timespec="seconds")),
        )
        connection.commit()
        return True
    except sqlite3.Error:
        return False
    finally:
        connection.close()


def delete_password(username: str) -> None:
    if not username:
        return
    connection = _connection()
    try:
        connection.execute("DELETE FROM plugin_credentials WHERE username = ?", (username,))
        connection.commit()
    finally:
        connection.close()


def mask_account(account: str) -> str:
    value = str(account or "").strip()
    if len(value) <= 4:
        return "****"
    return value[:2] + "****" + value[-2:]
