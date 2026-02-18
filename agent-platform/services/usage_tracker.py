from uuid import UUID

from sqlalchemy.orm import Session

from core.models import UsageLog, User, Workspace


class UsageTracker:
    def __init__(self, db: Session):
        self.db = db

    def log_event(
        self,
        firebase_uid: str,
        event_type: str,
        workspace_id: UUID | None,
        details: str | None = None,
    ) -> None:
        user = self._get_user(firebase_uid)
        workspace = None
        if workspace_id is not None:
            workspace = self._get_workspace(workspace_id)
        log = UsageLog(
            user_id=user.id,
            workspace_id=workspace.id if workspace is not None else None,
            event_type=event_type,
            details=details,
        )
        self.db.add(log)
        self.db.commit()

    def _get_user(self, firebase_uid: str) -> User:
        return self.db.query(User).filter(User.firebase_uid == firebase_uid).one()

    def _get_workspace(self, workspace_id: UUID) -> Workspace:
        return self.db.query(Workspace).filter(Workspace.id == workspace_id).one()

