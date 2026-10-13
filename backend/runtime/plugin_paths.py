from __future__ import annotations

import os
from pathlib import Path


def data_root() -> Path:
    configured = os.environ.get("IEPMS_PLUGIN_DATA_ROOT", "").strip()
    if configured:
        root = Path(configured).expanduser().resolve()
    else:
        root = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "DeepSeek Harness" / "plugins" / "iepms-attendance-plugin"
    root.mkdir(parents=True, exist_ok=True)
    return root
