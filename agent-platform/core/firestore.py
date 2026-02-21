import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.client import Client

from .config import settings


def _ensure_firebase_initialized() -> None:
    if firebase_admin._apps:
        return
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()


def get_firestore_client() -> Client:
    _ensure_firebase_initialized()
    return firestore.client()
