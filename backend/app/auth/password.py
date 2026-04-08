"""
Password hashing utilities — Faz 3.

Uses bcrypt directly for secure password storage.
(passlib 1.7.4 is incompatible with bcrypt 5.x, so we use bcrypt API directly.)
"""

import bcrypt


def hash_password(password: str) -> str:
    """Hash a plaintext password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
