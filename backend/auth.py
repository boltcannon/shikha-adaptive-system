from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt as _bcrypt
import os

SECRET_KEY = os.getenv(
    "SECRET_KEY", "shikha-secret-key-change-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def _pw_bytes(password: str) -> bytes:
    """Encode and truncate to 72 bytes — bcrypt's hard limit."""
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(_pw_bytes(password), _bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(_pw_bytes(plain), hashed.encode("utf-8"))


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
