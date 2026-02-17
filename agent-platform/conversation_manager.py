from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from models import Conversation, Message, User, Workspace


class ConversationManager:
    def __init__(self, db: Session):
        self.db = db

    def start_conversation(self, firebase_uid: str, workspace_id: UUID, title: str | None = None) -> Conversation:
        user = self._get_user(firebase_uid)
        workspace = self._get_workspace(workspace_id)
        conversation = Conversation(
            workspace_id=workspace.id,
            user_id=user.id,
            title=title,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def add_message(self, conversation_id: UUID, role: str, content: str) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            created_at=datetime.utcnow(),
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def list_conversations(self, firebase_uid: str, workspace_id: UUID) -> list[Conversation]:
        user = self._get_user(firebase_uid)
        return (
            self.db.query(Conversation)
            .filter(
                Conversation.workspace_id == workspace_id,
                Conversation.user_id == user.id,
            )
            .order_by(Conversation.created_at.desc())
            .all()
        )

    def list_messages(self, conversation_id: UUID) -> list[Message]:
        return (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .all()
        )

    def _get_user(self, firebase_uid: str) -> User:
        return self.db.query(User).filter(User.firebase_uid == firebase_uid).one()

    def _get_workspace(self, workspace_id: UUID) -> Workspace:
        return self.db.query(Workspace).filter(Workspace.id == workspace_id).one()

