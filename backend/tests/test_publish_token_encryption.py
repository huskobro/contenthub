"""
Unit tests for app.core.crypto — TokenCipher used by publish token_store.

Covers:
    * encrypt/decrypt round-trip
    * idempotent encrypt (no double-wrap)
    * legacy plaintext pass-through on decrypt
    * wrong key fails cleanly
    * empty/None inputs are no-op
    * prefix version marker `enc:v1:`
"""

from __future__ import annotations

import pytest

from app.core.crypto import (
    ENC_PREFIX,
    TokenCipher,
    _derive_fernet_key,
    reset_token_cipher_for_tests,
)


def test_encrypt_decrypt_round_trip():
    cipher = TokenCipher("test-key-hardening-pack")
    plaintext = "ya29.a0AfH6SMBsomeTokenValue"
    enc = cipher.encrypt(plaintext)
    assert enc is not None
    assert enc.startswith(ENC_PREFIX)
    assert enc != plaintext
    assert cipher.decrypt(enc) == plaintext


def test_encrypt_empty_and_none_are_noop():
    cipher = TokenCipher("k")
    assert cipher.encrypt(None) is None
    assert cipher.encrypt("") == ""
    assert cipher.decrypt(None) is None
    assert cipher.decrypt("") == ""


def test_encrypt_is_idempotent_no_double_wrap():
    cipher = TokenCipher("k")
    enc = cipher.encrypt("hello")
    enc_again = cipher.encrypt(enc)
    assert enc == enc_again  # already prefixed → returned as-is


def test_legacy_plaintext_passes_through_on_decrypt():
    """Pre-hardening rows have no prefix — must not error, return as-is."""
    cipher = TokenCipher("k")
    assert cipher.decrypt("raw-plain-token") == "raw-plain-token"


def test_wrong_key_fails_cleanly():
    writer = TokenCipher("key-A")
    reader = TokenCipher("key-B")
    enc = writer.encrypt("secret")
    with pytest.raises(ValueError):
        reader.decrypt(enc)


def test_derive_fernet_key_accepts_valid_fernet_key_as_is():
    from cryptography.fernet import Fernet

    valid = Fernet.generate_key().decode("utf-8")
    derived = _derive_fernet_key(valid)
    assert derived == valid.encode("utf-8")


def test_derive_fernet_key_from_arbitrary_string_is_deterministic():
    d1 = _derive_fernet_key("same-seed")
    d2 = _derive_fernet_key("same-seed")
    d3 = _derive_fernet_key("different-seed")
    assert d1 == d2
    assert d1 != d3


def test_derive_fernet_key_rejects_empty():
    with pytest.raises(ValueError):
        _derive_fernet_key("")


def test_singleton_uses_settings(monkeypatch):
    """get_token_cipher reads settings.encryption_key; reset between runs."""
    from app.core import crypto as crypto_mod

    reset_token_cipher_for_tests()
    monkeypatch.setattr(crypto_mod, "_singleton", None, raising=False)
    # Patch settings object the module imports lazily.
    from app.core.config import settings as app_settings

    monkeypatch.setattr(app_settings, "encryption_key", "pytest-key-1", raising=False)
    c1 = crypto_mod.get_token_cipher()
    enc = c1.encrypt("hello")
    assert enc.startswith(ENC_PREFIX)
    assert c1.decrypt(enc) == "hello"
    # Reset and set a different key — decrypt must fail with old ciphertext.
    reset_token_cipher_for_tests()
    monkeypatch.setattr(app_settings, "encryption_key", "pytest-key-2", raising=False)
    c2 = crypto_mod.get_token_cipher()
    with pytest.raises(ValueError):
        c2.decrypt(enc)


def test_missing_key_debug_fallback(monkeypatch):
    """In debug mode, missing key triggers deterministic dev fallback (no raise)."""
    from app.core import crypto as crypto_mod
    from app.core.config import settings as app_settings

    reset_token_cipher_for_tests()
    monkeypatch.setattr(app_settings, "encryption_key", "", raising=False)
    monkeypatch.setattr(app_settings, "debug", True, raising=False)
    c = crypto_mod.get_token_cipher()
    enc = c.encrypt("x")
    assert c.decrypt(enc) == "x"


def test_missing_key_production_raises(monkeypatch):
    """In non-debug mode, missing key must raise at cipher access time."""
    from app.core import crypto as crypto_mod
    from app.core.config import settings as app_settings

    reset_token_cipher_for_tests()
    monkeypatch.setattr(app_settings, "encryption_key", "", raising=False)
    monkeypatch.setattr(app_settings, "debug", False, raising=False)
    with pytest.raises(RuntimeError):
        crypto_mod.get_token_cipher()
    # Cleanup: leave a usable cipher for other tests running after this one.
    reset_token_cipher_for_tests()
