# -*- coding: utf-8 -*-
"""
license_manager.py - 单机硬件绑定与离线授权管理
=================================================
业务说明：
1. 机器码生成：采集本机主板、UUID、CPU 与注册表 MachineGuid 等硬件指纹计算哈希，
   生成唯一的 20 位机器码（形如 XXXXX-XXXXX-XXXXX-XXXXX）。
2. 授权码核验：项目管理员根据机器码通过 HMAC 算法签发 25 位授权码。
3. 持久化存储：激活成功后凭证加密存入 Windows %LOCALAPPDATA% 全局目录与当前运行目录。
4. 跨版本支持：后续更新升级新版本 EXE 时，程序自动从全局目录继承授权，无需重复激活。
"""

import base64
import hashlib
import hmac
import json
import os
import subprocess
import sys
from plugin_paths import data_root

NAMESPACE = "iEPMS-LIC-v1"
MACHINE_CODE_GROUPS = 4      # 机器码 4 组 x 5 位
LICENSE_KEY_GROUPS = 5       # 授权码 5 组 x 5 位
GROUP_LEN = 5
_B32_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 去掉易混字符 I O 0 1

# SECRET 分片存储，运行时组装，避免明文常量直接出现在二进制中
_S1 = "7f3c9a1e4b8d2065"
_S2 = "ZTE-iEPMS-Attend"
_S3 = "ance-Monitor-V4x"
_S4 = "e51d7c0b96a4382f"


def _secret() -> bytes:
    return (_S2 + _S1 + _S4 + _S3).encode("utf-8")


SCRIPT_DIR = str(data_root())

# 本地运行目录凭证（兼容便携运行）
LOCAL_LICENSE_FILE = os.path.join(SCRIPT_DIR, ".license")
LOCAL_HWID_CACHE = os.path.join(SCRIPT_DIR, ".hwid_cache")

# 全局系统级持久化目录（跨版本更新时保持激活状态，永久生效）
GLOBAL_DATA_DIR = os.path.join(
    os.environ.get("LOCALAPPDATA", os.path.expanduser("~")),
    "iEPMS_Attendance_Monitor"
)
GLOBAL_LICENSE_FILE = os.path.join(GLOBAL_DATA_DIR, ".license")
GLOBAL_HWID_CACHE = os.path.join(GLOBAL_DATA_DIR, ".hwid_cache")

# 向后兼容
LICENSE_FILE = LOCAL_LICENSE_FILE
_FINGERPRINT_CACHE_FILE = LOCAL_HWID_CACHE
_DPAPI_ENTROPY = b"iEPMS-Monitor-License-Entropy-v1"


def _log(msg):
    try:
        from logger import log
        log(msg)
    except Exception:
        pass


# ============================================================
# Base32 编码（自定义字母表，输出仅大写字母与数字）
# ============================================================
def _to_base32(raw: bytes, length: int) -> str:
    """将字节流映射为指定长度的自定义 Base32 字符串。"""
    num = int.from_bytes(raw, "big")
    out = []
    for _ in range(length):
        out.append(_B32_ALPHABET[num % 32])
        num //= 32
    return "".join(out)


def _group(text: str, group_len: int = GROUP_LEN) -> str:
    return "-".join(text[i:i + group_len] for i in range(0, len(text), group_len))


def normalize_code(code: str) -> str:
    """去除分隔符与空白并转大写，便于比较与容错输入。"""
    if not code:
        return ""
    return "".join(ch for ch in str(code).upper() if ch in _B32_ALPHABET)


# ============================================================
# 硬件指纹采集
# ============================================================
def _run_ps(script: str, timeout: int = 12) -> str:
    """执行 PowerShell 片段，返回 stdout（失败返回空串）。"""
    kw = {}
    if sys.platform == "win32":
        kw["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive",
             "-ExecutionPolicy", "Bypass", "-Command", script],
            capture_output=True, text=True, timeout=timeout, **kw
        )
        if r.returncode == 0:
            return (r.stdout or "").strip()
    except Exception as e:
        _log(f"[授权] 指纹采集失败: {type(e).__name__}")
    return ""


def _machine_guid() -> str:
    """注册表 MachineGuid，系统重装才会变化。"""
    try:
        import winreg
        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
            0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY,
        ) as k:
            return str(winreg.QueryValueEx(k, "MachineGuid")[0]).strip()
    except Exception:
        return ""


_PS_FINGERPRINT = (
    "$ErrorActionPreference='SilentlyContinue';"
    "$b=(Get-CimInstance Win32_BaseBoard).SerialNumber;"
    "$u=(Get-CimInstance Win32_ComputerSystemProduct).UUID;"
    "$c=(Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId;"
    "Write-Output \"board=$b\";Write-Output \"uuid=$u\";Write-Output \"cpu=$c\""
)


def _collect_fingerprint_parts() -> dict:
    """
    采集多源硬件标识。单项失败不影响其余项。
    三项 WMI 查询合并为单次 PowerShell 调用，避免首次启动连开 3 个进程的卡顿；
    产出的键名与取值与逐项采集完全一致，不影响已签发凭证的指纹稳定性。
    """
    parts = {"guid": _machine_guid(), "board": "", "uuid": "", "cpu": ""}
    for line in _run_ps(_PS_FINGERPRINT).splitlines():
        k, sep, v = line.partition("=")
        if sep and k.strip() in parts:
            parts[k.strip()] = v.strip()

    cleaned = {}
    for k, v in parts.items():
        v = (v or "").strip()
        # 过滤 WMI 常见占位值
        if v.upper() in ("", "TO BE FILLED BY O.E.M.", "DEFAULT STRING",
                         "NONE", "N/A", "SYSTEM SERIAL NUMBER",
                         "00000000-0000-0000-0000-000000000000"):
            v = ""
        cleaned[k] = v
    return cleaned


def _fingerprint_raw() -> str:
    """
    生成稳定的硬件指纹原文。
    至少需要 2 项有效标识；不足时用 MachineGuid 兜底，
    全部失败则抛异常，由上层提示环境异常，绝不退化为随机值
    （随机值会导致每次启动机器码变化，授权立即失效）。
    """
    parts = _collect_fingerprint_parts()
    valid = {k: v for k, v in parts.items() if v}

    if len(valid) < 2 and not parts.get("guid"):
        # 采集彻底失败：尝试读取上次缓存，避免误伤已激活用户
        cached = _read_fingerprint_cache()
        if cached:
            _log("[授权] 硬件指纹采集失败，使用本机缓存指纹")
            return cached
        raise RuntimeError("无法读取本机硬件标识")

    raw = "|".join(f"{k}={parts.get(k, '')}" for k in sorted(parts))
    _write_fingerprint_cache(raw)
    return raw


def _read_fingerprint_cache() -> str:
    """读取 DPAPI 加密的指纹缓存（优先读取本地，回退读取全局持久化缓存）。"""
    import win32crypt
    for cache_path in (LOCAL_HWID_CACHE, GLOBAL_HWID_CACHE):
        try:
            if not os.path.exists(cache_path):
                continue
            with open(cache_path, "rb") as f:
                blob = f.read()
            raw = win32crypt.CryptUnprotectData(blob, _DPAPI_ENTROPY, None, None, 0)[1]
            if raw:
                return raw.decode("utf-8")
        except Exception:
            continue
    return ""


def _write_fingerprint_cache(raw: str) -> None:
    """将指纹缓存同时写入全局与本地目录，确保跨版本更新指纹绝对一致。"""
    try:
        import win32crypt
        blob = win32crypt.CryptProtectData(
            raw.encode("utf-8"), None, _DPAPI_ENTROPY, None, None, 0
        )
        # 1. 写入本地
        try:
            with open(LOCAL_HWID_CACHE, "wb") as f:
                f.write(blob)
        except Exception:
            pass

        # 2. 写入全局持久化目录
        try:
            os.makedirs(GLOBAL_DATA_DIR, exist_ok=True)
            with open(GLOBAL_HWID_CACHE, "wb") as f:
                f.write(blob)
        except Exception:
            pass
    except Exception:
        pass


# ============================================================
# 机器码与授权码
# ============================================================
def get_machine_code() -> str:
    """
    返回本机机器码，形如 A1B2C-D3E4F-G5H6J-K7L8M（4 组 x 5 位）。
    同一台机器上恒定，不同机器几乎不可能相同。
    """
    raw = _fingerprint_raw()
    digest = hashlib.sha256((NAMESPACE + "|HWID|" + raw).encode("utf-8")).digest()
    return _group(_to_base32(digest, MACHINE_CODE_GROUPS * GROUP_LEN))


def generate_license_key(machine_code: str) -> str:
    """
    由机器码签发授权码（签发方使用，见 tools/issue_license.py）。
    形如 A1B2C-D3E4F-G5H6J-K7L8M-N9P0Q（5 组 x 5 位）。
    """
    mc = normalize_code(machine_code)
    if len(mc) != MACHINE_CODE_GROUPS * GROUP_LEN:
        raise ValueError(
            f"机器码格式错误：应为 {MACHINE_CODE_GROUPS * GROUP_LEN} 位有效字符，实际 {len(mc)} 位"
        )
    sig = hmac.new(_secret(), (NAMESPACE + "|KEY|" + mc).encode("utf-8"),
                   hashlib.sha256).digest()
    return _group(_to_base32(sig, LICENSE_KEY_GROUPS * GROUP_LEN))


def verify_license_key(machine_code: str, license_key: str) -> bool:
    """校验授权码是否与机器码匹配（常量时间比较）。"""
    try:
        expected = normalize_code(generate_license_key(machine_code))
    except Exception:
        return False
    return hmac.compare_digest(expected, normalize_code(license_key))


# ============================================================
# 激活凭证持久化（DPAPI 加密，跨机器无法解密，跨版本自动继承）
# ============================================================
def _save_activation(machine_code: str, license_key: str) -> bool:
    """保存激活凭证，同时写入本地与全局 LocalAppData 目录。"""
    payload = json.dumps({
        "machine_code": normalize_code(machine_code),
        "license_key": normalize_code(license_key),
        "ns": NAMESPACE,
    }, ensure_ascii=False)
    try:
        import win32crypt
        blob = win32crypt.CryptProtectData(
            payload.encode("utf-8"), None, _DPAPI_ENTROPY, None, None, 0
        )

        saved = False
        # 1. 写入本地运行目录
        try:
            with open(LOCAL_LICENSE_FILE, "wb") as f:
                f.write(blob)
            saved = True
        except Exception:
            pass

        # 2. 写入全局持久化目录（跨版本更新时保持激活状态）
        try:
            os.makedirs(GLOBAL_DATA_DIR, exist_ok=True)
            with open(GLOBAL_LICENSE_FILE, "wb") as f:
                f.write(blob)
            saved = True
        except Exception:
            pass

        return saved
    except Exception as e:
        _log(f"[授权] 凭证写入失败: {type(e).__name__}")
        return False


def _load_activation() -> dict:
    """
    读取并解密激活凭证。
    多源读取顺序：本地 .license -> 全局 LocalAppData\\.license。
    若从全局持久化目录读取成功，自动同步至本地运行目录，实现版本更新免二次激活。
    """
    import win32crypt

    # 1. 尝试从本地凭证文件读取
    if os.path.exists(LOCAL_LICENSE_FILE):
        try:
            with open(LOCAL_LICENSE_FILE, "rb") as f:
                blob = f.read()
            raw = win32crypt.CryptUnprotectData(blob, _DPAPI_ENTROPY, None, None, 0)[1]
            data = json.loads(raw.decode("utf-8"))
            if isinstance(data, dict) and data.get("ns") == NAMESPACE:
                # 顺便同步至全局
                try:
                    os.makedirs(GLOBAL_DATA_DIR, exist_ok=True)
                    if not os.path.exists(GLOBAL_LICENSE_FILE):
                        with open(GLOBAL_LICENSE_FILE, "wb") as f:
                            f.write(blob)
                except Exception:
                    pass
                return data
        except Exception:
            pass

    # 2. 尝试从全局持久化目录读取（版本升级后新目录无本地文件时无缝继承）
    if os.path.exists(GLOBAL_LICENSE_FILE):
        try:
            with open(GLOBAL_LICENSE_FILE, "rb") as f:
                blob = f.read()
            raw = win32crypt.CryptUnprotectData(blob, _DPAPI_ENTROPY, None, None, 0)[1]
            data = json.loads(raw.decode("utf-8"))
            if isinstance(data, dict) and data.get("ns") == NAMESPACE:
                _log("[授权] 检测到全局合法激活凭证，已自动继承授权")
                # 自动静默同步至本地目录
                try:
                    with open(LOCAL_LICENSE_FILE, "wb") as f:
                        f.write(blob)
                except Exception:
                    pass
                return data
        except Exception:
            pass

    return {}


def activate(license_key: str) -> tuple:
    """
    执行激活。返回 (是否成功, 提示信息)。
    """
    key = normalize_code(license_key)
    if len(key) != LICENSE_KEY_GROUPS * GROUP_LEN:
        return False, f"授权码应为 {LICENSE_KEY_GROUPS * GROUP_LEN} 位字符，请检查后重新输入"
    try:
        mc = get_machine_code()
    except Exception:
        return False, "无法读取本机硬件信息，请以管理员身份重试"

    if not verify_license_key(mc, key):
        return False, "授权码与本机机器码不匹配，请确认是否使用了本机的机器码申请"

    if not _save_activation(mc, key):
        return False, "授权信息保存失败，请检查程序目录写入权限"
    _log("[授权] 激活成功")
    return True, "激活成功"


def is_activated() -> bool:
    """
    校验当前机器是否已合法激活。任一环节不通过即返回 False：
      1. 凭证文件存在且可用本机 DPAPI 解密（阻断跨机拷贝 .license）
      2. 凭证内机器码 == 当前实时重算的机器码（阻断跨机拷贝机器码+授权码）
      3. 授权码 HMAC 签名有效（阻断伪造授权码）
    """
    data = _load_activation()
    if not data or data.get("ns") != NAMESPACE:
        return False
    try:
        current_mc = normalize_code(get_machine_code())
    except Exception:
        return False
    if not hmac.compare_digest(normalize_code(data.get("machine_code", "")), current_mc):
        _log("[授权] 机器码与激活记录不符，拒绝启动")
        return False
    return verify_license_key(current_mc, data.get("license_key", ""))


def require_activation(entry_name: str = "") -> bool:
    """
    无人值守入口（计划任务、命令行）的授权门。
    未激活时写日志并返回 False，由调用方立即终止，不弹窗、不阻塞。
    """
    if is_activated():
        return True
    _log(f"[授权] 未激活，拒绝执行{('：' + entry_name) if entry_name else ''}")
    return False


def deactivate() -> None:
    """清除本机激活状态（调试与换机用）。"""
    for p in (LOCAL_LICENSE_FILE, GLOBAL_LICENSE_FILE, LOCAL_HWID_CACHE, GLOBAL_HWID_CACHE):
        try:
            if os.path.exists(p):
                os.remove(p)
        except Exception:
            pass


if __name__ == "__main__":
    print("机器码 :", get_machine_code())
    print("已激活 :", is_activated())

