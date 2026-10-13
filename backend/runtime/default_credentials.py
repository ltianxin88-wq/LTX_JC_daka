"""Packaged default iEPMS credentials.

The value below is an authenticated encrypted envelope, not plaintext.  Its
decryption key ships with the plugin, so it deters accidental disclosure only;
it is not a replacement for server-side secret management.
"""

from __future__ import annotations

import base64
import hashlib
import hmac


_ENVELOPE = b"db_kGQ0SY91UQ_-wjxud6wcE_na--wpUFDkKONlWH2j90s73b9EkuV0fvO8D4kaazUoFTpg0rlypoT3UijkYNWb118XB"
_KEY_MATERIAL = b"iepms-attendance-plugin/default-credential/v1|packaged"


def _keystream(key: bytes, nonce: bytes, size: int) -> bytes:
    blocks = (size + 31) // 32
    return b"".join(
        hmac.new(key, nonce + index.to_bytes(4, "big"), hashlib.sha256).digest()
        for index in range(blocks)
    )[:size]


def load_packaged_credentials() -> tuple[str, str]:
    """Decrypt and validate the bundled default account for trusted runtime use."""
    raw = base64.urlsafe_b64decode(_ENVELOPE)
    nonce, tag, ciphertext = raw[:16], raw[16:48], raw[48:]
    key = hashlib.sha256(_KEY_MATERIAL).digest()
    expected_tag = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected_tag):
        raise ValueError("默认凭据校验失败。")
    plaintext = bytes(a ^ b for a, b in zip(ciphertext, _keystream(key, nonce, len(ciphertext))))
    username, separator, password = plaintext.partition(b"\0")
    if not separator or not username or not password:
        raise ValueError("默认凭据格式无效。")
    return username.decode("utf-8"), password.decode("utf-8")
