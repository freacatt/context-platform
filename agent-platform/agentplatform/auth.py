from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel


class AuthedUser(BaseModel):
    firebase_uid: str


def extract_firebase_uid(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty token")
    return token


def get_current_user(authorization: Optional[str] = Header(default=None, convert_underscores=False)) -> AuthedUser:
    firebase_uid = extract_firebase_uid(authorization)
    return AuthedUser(firebase_uid=firebase_uid)

