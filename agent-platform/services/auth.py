from typing import Optional

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel


class AuthedUser(BaseModel):
    firebase_uid: str


def _get_bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty token")
    return token


def _ensure_firebase_app_initialized() -> None:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


def get_current_user(authorization: Optional[str] = Header(default=None, convert_underscores=False)) -> AuthedUser:
    token = _get_bearer_token(authorization)
    _ensure_firebase_app_initialized()
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    firebase_uid = decoded.get("uid")
    if not firebase_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing uid claim")
    return AuthedUser(firebase_uid=firebase_uid)

