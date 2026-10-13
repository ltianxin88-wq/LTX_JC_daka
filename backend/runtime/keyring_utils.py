# -*- coding: utf-8 -*-
"""Plugin-local account and password storage.

The desktop plugin intentionally does not depend on Windows Credential Manager,
DPAPI, or a separately installed keyring package. Credentials are persisted in
the plugin-owned SQLite database and are never returned by bridge responses or
written to logs.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from plugin_paths import data_root


DATABASE_FILE = Path(data_root()) / "iepms-attendance-plugin.db"


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
        return str(row[0]) if row is not None else None
    finally:
        connection.close()


def set_password(username: str, password: str) -> bool:
    if not username or not password:
        return False
    connection = _connection()
    try:
        connection.execute(
            """INSERT INTO plugin_credentials (username, password, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                password = excluded.password, updated_at = excluded.updated_at""",
            (username, password, datetime.now().isoformat(timespec="seconds")),
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
