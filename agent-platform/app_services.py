from dataclasses import dataclass
from enum import Enum
from uuid import UUID

from sqlalchemy.orm import Session

from models import User, Workspace
from policy_engine import PolicyEngine


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


def get_workspace_app_permissions(db: Session, firebase_uid: str, workspace_id: UUID) -> list[AppPermission]:
    policy = PolicyEngine(db)
    policy.assert_workspace_owner(firebase_uid, workspace_id)
    user = db.query(User).filter(User.firebase_uid == firebase_uid).one()
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).one()
    plan_type = user.plan_type
    permissions: list[AppPermission] = []
    for app in AppId:
        can_read = True
        can_write = True
        reason = None
        permissions.append(AppPermission(app_id=app, can_read=can_read, can_write=can_write, reason=reason))
    return permissions

