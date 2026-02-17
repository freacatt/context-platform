from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Workspace, User


class PermissionError(Exception):
    pass


class PolicyEngine:
    def __init__(self, db: Session):
        self.db = db

    def assert_workspace_owner(self, firebase_uid: str, workspace_id: UUID) -> None:
        user_stmt = select(User).where(User.firebase_uid == firebase_uid)
        user = self.db.execute(user_stmt).scalar_one_or_none()
        if user is None:
            raise PermissionError("User has no workspaces")
        workspace_stmt = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_user_id == user.id,
        )
        workspace = self.db.execute(workspace_stmt).scalar_one_or_none()
        if workspace is None:
            raise PermissionError("Workspace not found or not owned by user")

