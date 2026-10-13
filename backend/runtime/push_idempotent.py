# -*- coding: utf-8 -*-
"""
push_idempotent.py - 钉钉推送防重与每日状态机
==============================================
业务说明：
1. 状态收敛：将当天的推送记录与心跳标记保存在单个 push_state.json 文件中，跨天自动覆盖刷新。
2. 幂等规则：
   - 全员已完成打卡（EMPTY 指纹）：当天只推一次，不重复打扰。
   - 有人未打卡（缺卡名单指纹）：每次巡检均推送到群里 @ 对应人员进行催卡提醒。
"""

import glob
import hashlib
import json
import os
import sys
from plugin_paths import data_root

SCRIPT_DIR = str(data_root())

STATE_FILE = os.path.join(SCRIPT_DIR, "push_state.json")


def cleanup_legacy_state_files():
    """自动清理历史上生成的散落 push_state_*.json 和 heartbeat_*.ok 文件"""
    try:
        patterns = [
            os.path.join(SCRIPT_DIR, "push_state_*.json"),
            os.path.join(SCRIPT_DIR, "heartbeat_*.ok"),
        ]
        for pattern in patterns:
            for filepath in glob.glob(pattern):
                try:
                    os.remove(filepath)
                except Exception:
                    pass
    except Exception:
        pass


def make_fingerprint(items):
    """对人员集合（如缺卡人列表）生成稳定指纹。空列表返回固定值。"""
    if not items:
        return "EMPTY"
    normalized = sorted(str(i).strip() for i in items if str(i).strip())
    return hashlib.md5("|".join(normalized).encode("utf-8")).hexdigest()[:16]


def _load_raw_file():
    if not os.path.exists(STATE_FILE):
        return {}
    try:
        import portalocker
        with portalocker.Lock(STATE_FILE, "r", encoding="utf-8", timeout=5) as f:
            return json.load(f)
    except Exception:
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}


def _save_raw_file(raw_dict):
    try:
        import portalocker
        with portalocker.Lock(STATE_FILE, "w", encoding="utf-8", timeout=5) as f:
            json.dump(raw_dict, f, ensure_ascii=False, indent=2)
    except Exception:
        try:
            with open(STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(raw_dict, f, ensure_ascii=False, indent=2)
        except Exception:
            pass


def _load_state(date_str):
    """读取指定日期的状态，若文件记录的非当日数据，则自动跨天重置。"""
    raw = _load_raw_file()
    if raw.get("date") != date_str:
        return {}
    return raw.get("projects", {})


def _save_state(date_str, state):
    raw = _load_raw_file()
    if raw.get("date") != date_str:
        raw = {"date": date_str, "projects": {}, "heartbeats": {}}
    raw["projects"] = state
    _save_raw_file(raw)


def should_push(project_name, msg_type, fingerprint, date_str):
    """
    判断是否应推送。
    1. fingerprint == "EMPTY"（已全部完成）：当日同类型只推一次，避免重复骚扰
    2. fingerprint != "EMPTY"（有人未打卡）：每次都推送，持续提醒，避免遗漏
    """
    if fingerprint != "EMPTY":
        return True

    state = _load_state(date_str)
    proj = state.get(project_name, {})
    return proj.get(msg_type) != fingerprint


def mark_pushed(project_name, msg_type, fingerprint, date_str):
    """记录已推送。"""
    state = _load_state(date_str)
    state.setdefault(project_name, {})[msg_type] = fingerprint
    _save_state(date_str, state)


def filter_and_mark(project_name, msg_type, fingerprint, date_str):
    """便捷组合：应推则记录并返回 True，否则返回 False。"""
    if should_push(project_name, msg_type, fingerprint, date_str):
        mark_pushed(project_name, msg_type, fingerprint, date_str)
        return True
    return False


# ============================================================
# 看门狗心跳状态聚合（消除 heartbeat_*.ok 文件）
# ============================================================
def write_heartbeat(date_str, check_mode):
    """在统一状态文件中记录巡检完成心跳"""
    raw = _load_raw_file()
    if raw.get("date") != date_str:
        raw = {"date": date_str, "projects": {}, "heartbeats": {}}
    raw.setdefault("heartbeats", {})[check_mode] = True
    _save_raw_file(raw)


def check_heartbeat(date_str, check_mode) -> bool:
    """检查指定日期和模式的巡检是否已成功完成"""
    raw = _load_raw_file()
    if raw.get("date") != date_str:
        return False
    return bool(raw.get("heartbeats", {}).get(check_mode, False))
