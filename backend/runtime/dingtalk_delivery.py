# -*- coding: utf-8 -*-
"""
dingtalk_delivery.py - 钉钉群消息推送与频控限流管理
====================================================
业务说明：
1. 请求限流：同一群机器人默认相邻发送间隔 4 秒，防止触发钉钉接口频控。
2. 错误自愈：遇到 660026 频控拦截时，自动冷却 60 秒后重试。
3. 消息分批：手机号与钉钉 ID 超出上限时自动分批发送，确保全员准确 @ 到人。
"""

import hashlib
import os
import tempfile
import threading
import time
from urllib.parse import urlsplit, urlunsplit


RATE_LIMIT_ERRCODE = 660026
DEFAULT_MIN_INTERVAL_SECONDS = 4.0
DEFAULT_COOLDOWN_SECONDS = 60.0


class DingTalkRateLimiter:
    """单一发送通道节流器，保证相邻请求至少间隔 ``min_interval`` 秒。"""

    def __init__(self, min_interval=DEFAULT_MIN_INTERVAL_SECONDS, sleep_func=time.sleep,
                 clock_func=time.monotonic, state_file=None, wall_clock_func=time.time):
        if min_interval < 0:
            raise ValueError("min_interval must be non-negative")
        self.min_interval = float(min_interval)
        self._sleep = sleep_func
        self._clock = clock_func
        self._wall_clock = wall_clock_func
        self._state_file = state_file
        self._last_request_at = None
        self._lock = threading.Lock()

    def wait_for_slot(self):
        """在当前请求开始前等待到可用时隙，并记录本次请求开始时间。"""
        with self._lock:
            if self._state_file:
                try:
                    self._wait_for_shared_slot()
                    return
                except Exception:
                    # 文件锁不可用时退回进程内节流，发送链路仍保持可用。
                    pass

            now = self._clock()
            if self._last_request_at is not None:
                remaining = self.min_interval - (now - self._last_request_at)
                if remaining > 0:
                    self._sleep(remaining)
                    now = self._clock()
            self._last_request_at = now

    def _wait_for_shared_slot(self):
        """通过运行目录中的状态文件协调多个计划任务进程。"""
        import portalocker

        state_dir = os.path.dirname(os.path.abspath(self._state_file))
        os.makedirs(state_dir, exist_ok=True)
        with portalocker.Lock(self._state_file, "a+", encoding="utf-8", timeout=30) as state:
            state.seek(0)
            try:
                last_request_at = float(state.read().strip())
            except (TypeError, ValueError):
                last_request_at = None

            now = self._wall_clock()
            if last_request_at is not None:
                remaining = self.min_interval - (now - last_request_at)
                if remaining > 0:
                    self._sleep(min(remaining, self.min_interval))
                    now = self._wall_clock()

            state.seek(0)
            state.truncate()
            state.write(str(now))
            state.flush()


def _normalize_webhook_url(webhook_url):
    """生成稳定的限流键输入，保留决定机器人身份的路径与查询参数。"""
    if not isinstance(webhook_url, str):
        raise TypeError("webhook_url must be a string")

    normalized = webhook_url.strip()
    if not normalized:
        raise ValueError("webhook_url must not be empty")

    try:
        parts = urlsplit(normalized)
    except ValueError:
        return normalized

    if not parts.scheme or not parts.netloc:
        return normalized
    return urlunsplit((
        parts.scheme.lower(),
        parts.netloc.lower(),
        parts.path,
        parts.query,
        "",
    ))


class DingTalkWebhookRateLimiter:
    """按 Webhook 分片限流，同一 Webhook 跨线程、跨进程共享时隙。"""

    def __init__(self, state_dir, min_interval=DEFAULT_MIN_INTERVAL_SECONDS,
                 sleep_func=time.sleep, clock_func=time.monotonic,
                 wall_clock_func=time.time):
        self._state_dir = os.path.abspath(state_dir)
        self._min_interval = min_interval
        self._sleep = sleep_func
        self._clock = clock_func
        self._wall_clock = wall_clock_func
        self._limiters = {}
        self._lock = threading.Lock()

    def wait_for_slot(self, webhook_url):
        """只等待目标 Webhook 自己的发送时隙。"""
        self._limiter_for(webhook_url).wait_for_slot()

    def _limiter_for(self, webhook_url):
        normalized_url = _normalize_webhook_url(webhook_url)
        webhook_key = hashlib.sha256(normalized_url.encode("utf-8")).hexdigest()

        with self._lock:
            limiter = self._limiters.get(webhook_key)
            if limiter is None:
                state_file = os.path.join(
                    self._state_dir,
                    f"dingtalk_rate_limit_{webhook_key}.lock",
                )
                limiter = DingTalkRateLimiter(
                    min_interval=self._min_interval,
                    sleep_func=self._sleep,
                    clock_func=self._clock,
                    state_file=state_file,
                    wall_clock_func=self._wall_clock,
                )
                self._limiters[webhook_key] = limiter
            return limiter


_RATE_LIMIT_STATE_DIR = os.path.join(
    tempfile.gettempdir(),
    "iEPMS_Attendance_Monitor",
)

# 所有发送入口共用路由器；相同 Webhook 跨进程共享状态，不同 Webhook 独立。
GLOBAL_DINGTALK_RATE_LIMITER = DingTalkWebhookRateLimiter(
    state_dir=_RATE_LIMIT_STATE_DIR,
)


def response_errcode(response_json):
    """从钉钉 JSON 响应中提取整数错误码；成功或异常响应返回 ``None``。"""
    if not isinstance(response_json, dict):
        return None
    try:
        return int(response_json.get("errcode"))
    except (TypeError, ValueError):
        return None


def is_rate_limited(response_json):
    """判断响应是否为钉钉每分钟消息数超限。"""
    return response_errcode(response_json) == RATE_LIMIT_ERRCODE


def wait_after_rate_limit(response_json, sleep_func=time.sleep,
                          cooldown_seconds=DEFAULT_COOLDOWN_SECONDS):
    """命中 660026 时执行冷却，调用方据返回值决定是否重试。"""
    if not is_rate_limited(response_json):
        return False
    sleep_func(cooldown_seconds)
    return True
