# -*- coding: utf-8 -*-
"""
keyring_utils.py - iEPMS 登录凭据安全存取组件
==============================================
业务说明：
1. 密码安全存储：优先使用 Windows 凭据管理器（Credential Manager）加密存储 iEPMS 密码。
2. 降级容错：若 keyring 库不可用，自动降级为 Windows DPAPI 硬件加密。
3. 脱敏处理：日志与界面中展示账号时保留前 2 后 2 位（如 60****08）。
"""

import base64
import os
import sys
import json
from plugin_paths import data_root

SERVICE_NAME = "iEPMS_Monitor"

SCRIPT_DIR = str(data_root())

_DPAPI_FILE = os.path.join(SCRIPT_DIR, ".credential")


def _log(msg):
    try:
        from logger import log
        log(msg)
    except Exception:
        try:
            print(msg)
        except Exception:
            pass


# ============================================================
# keyring 后端
# ============================================================
def _keyring_available():
    try:
        import keyring
        # 触发一次后端探测，某些环境下后端不可用会抛异常
        keyring.get_keyring()
        return True
    except Exception:
        return False


def get_password(username):
    """读取指定账号的密码。返回 None 表示未存储。"""
    if not username:
        return None
    if _keyring_available():
        try:
            import keyring
            return keyring.get_password(SERVICE_NAME, username)
        except Exception as e:
            _log(f"[凭据] keyring 读取失败，尝试 DPAPI 降级: {e}")
    return _dpapi_read(username)


def set_password(username, password):
    """写入指定账号的密码。"""
    if not username or not password:
        return False
    if _keyring_available():
        try:
            import keyring
            keyring.set_password(SERVICE_NAME, username, password)
            return True
        except Exception as e:
            _log(f"[凭据] keyring 写入失败，尝试 DPAPI 降级: {e}")
    return _dpapi_write(username, password)


def delete_password(username):
    """删除指定账号的密码（尽力而为）。"""
    if not username:
        return
    if _keyring_available():
        try:
            import keyring
            keyring.delete_password(SERVICE_NAME, username)
        except Exception:
            pass
    try:
        if os.path.exists(_DPAPI_FILE):
            with open(_DPAPI_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if username in data:
                del data[username]
                with open(_DPAPI_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f)
    except Exception:
        pass


# ============================================================
# DPAPI 降级后端（pywin32）
# ============================================================
def _dpapi_read(username):
    try:
        import win32crypt
        if not os.path.exists(_DPAPI_FILE):
            return None
        with open(_DPAPI_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        blob = data.get(username)
        if not blob:
            return None
        raw = win32crypt.CryptUnprotectData(base64.b64decode(blob), None, None, None, 0)[1]
        return raw.decode("utf-8")
    except Exception:
        return None


def _dpapi_write(username, password):
    try:
        import win32crypt
        blob = win32crypt.CryptProtectData(password.encode("utf-8"), None, None, None, None, 0)
        data = {}
        if os.path.exists(_DPAPI_FILE):
            try:
                with open(_DPAPI_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}
        data[username] = base64.b64encode(blob).decode("ascii")
        with open(_DPAPI_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
        return True
    except Exception as e:
        _log(f"[凭据] DPAPI 写入失败: {e}")
        return False


# ============================================================
# 账号脱敏
# ============================================================
def mask_account(acc):
    """工号脱敏：保留前2后2，如 60****08。用于一切日志与界面显示。"""
    s = str(acc or "").strip()
    if len(s) <= 4:
        return "****"
    return s[:2] + "****" + s[-2:]
