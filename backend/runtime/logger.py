# -*- coding: utf-8 -*-
"""
logger.py - 统一日志模块
=========================
全项目唯一日志出口：logging + RotatingFileHandler（5 份 x 2MB 滚动）。
同时输出到控制台（若有控制台）。替代旧的 safe_print / print 覆写等自制方案。
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from plugin_paths import data_root

SCRIPT_DIR = str(data_root())

LOG_FILE = os.path.join(SCRIPT_DIR, "run_log.txt")

_logger = None


class SafeStreamHandler(logging.StreamHandler):
    """安全流输出处理器，防止在 unittest 捕获/重定向 stdout 导致 closed file 报错"""
    def emit(self, record):
        try:
            if self.stream is None or getattr(self.stream, 'closed', False):
                return
            super().emit(record)
        except Exception:
            pass


def get_logger():
    global _logger
    if _logger is not None:
        return _logger

    logger = logging.getLogger("iepms")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    fmt = logging.Formatter("[%(asctime)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

    try:
        fh = RotatingFileHandler(LOG_FILE, maxBytes=2 * 1024 * 1024, backupCount=5, encoding="utf-8")
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except Exception:
        pass

    # 控制台流输出处理器
    try:
        if sys.stdout is not None and not getattr(sys.stdout, 'closed', False):
            ch = SafeStreamHandler(sys.stdout)
            ch.setFormatter(fmt)
            logger.addHandler(ch)
    except Exception:
        pass

    _logger = logger
    return logger


def log(msg):
    """全项目统一日志入口（替换旧 safe_print）。"""
    text = str(msg)
    try:
        get_logger().info(text)
    except Exception:
        try:
            if sys.stdout and not getattr(sys.stdout, 'closed', False):
                print(text, flush=True)
        except Exception:
            pass

