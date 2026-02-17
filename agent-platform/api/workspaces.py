from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import AuthedUser, get_current_user
from deps import get_db
from models import User, Workspace, WorkspaceIndexStatus


router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class WorkspaceCreateRequest(BaseModel):
    name: str


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreateRequest,
    current_user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceResponse:
    if not current_user.firebase_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthenticated")
    user_stmt = select(User).where(User.firebase_uid == current_user.firebase_uid)
    user = db.execute(user_stmt).scalar_one_or_none()
    if user is None:
        user = User(firebase_uid=current_user.firebase_uid)
        db.add(user)
        db.flush()
    workspace = Workspace(owner_user_id=user.id, name=payload.name)
    db.add(workspace)
    db.flush()
    index_status = WorkspaceIndexStatus(workspace_id=workspace.id)
    db.add(index_status)
    db.commit()
    db.refresh(workspace)
    return WorkspaceResponse(id=workspace.id, name=workspace.name)

