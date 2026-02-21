from dataclasses import dataclass
from enum import Enum

from google.cloud.firestore_v1.client import Client

from services.policy_engine import PolicyEngine


class AppId(str, Enum):
    PYRAMIDS = "pyramids"
    PRODUCT_DEFINITIONS = "product_definitions"
    TECHNICAL_ARCHITECTURES = "technical_architectures"
    UI_UX_ARCHITECTURES = "ui_ux_architectures"
    TECHNICAL_TASKS = "technical_tasks"
    DIAGRAMS = "diagrams"
    CONTEXT_DOCUMENTS = "context_documents"
    PIPELINES = "pipelines"
    GLOBAL_TASKS = "global_tasks"


@dataclass
class AppPermission:
    app_id: AppId
    can_read: bool
    can_write: bool
    reason: str | None = None


def list_registered_apps() -> list[AppId]:
    return list(AppId)


def get_workspace_app_permissions(
    db: Client, firebase_uid: str, workspace_id: str
) -> list[AppPermission]:
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(firebase_uid, workspace_id)
    permissions: list[AppPermission] = []
    for app in AppId:
        permissions.append(
            AppPermission(app_id=app, can_read=True, can_write=True, reason=None)
        )
    return permissions
