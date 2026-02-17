from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app_services import AppId, AppPermission, get_workspace_app_permissions, list_registered_apps
from auth import AuthedUser, get_current_user
from deps import get_db
from policy_engine import PermissionError


router = APIRouter(prefix="/apps", tags=["apps"])


class AppDescriptor(BaseModel):
    id: str
    label: str


class AppPermissionResponse(BaseModel):
    app_id: str
    can_read: bool
    can_write: bool
    reason: str | None = None


class WorkspacePermissionsResponse(BaseModel):
    workspace_id: UUID
    apps: list[AppPermissionResponse]


@router.get("", response_model=list[AppDescriptor])
def list_apps() -> list[AppDescriptor]:
    return [
        AppDescriptor(id=app.value, label=app.value.replace("_", " ").title())
        for app in list_registered_apps()
    ]


@router.get("/workspaces/{workspace_id}/permissions", response_model=WorkspacePermissionsResponse)
def get_workspace_permissions(
    workspace_id: UUID,
    current_user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspacePermissionsResponse:
    try:
        permissions = get_workspace_app_permissions(db, current_user.firebase_uid, workspace_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return WorkspacePermissionsResponse(
        workspace_id=workspace_id,
        apps=[
            AppPermissionResponse(
                app_id=p.app_id.value,
                can_read=p.can_read,
                can_write=p.can_write,
                reason=p.reason,
            )
            for p in permissions
        ],
    )


@router.get("/workspaces/{workspace_id}/{app_id}/permissions", response_model=AppPermissionResponse)
def get_app_permissions(
    workspace_id: UUID,
    app_id: str,
    current_user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppPermissionResponse:
    try:
        permissions = get_workspace_app_permissions(db, current_user.firebase_uid, workspace_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    for p in permissions:
        if p.app_id.value == app_id:
            return AppPermissionResponse(
                app_id=p.app_id.value,
                can_read=p.can_read,
                can_write=p.can_write,
                reason=p.reason,
            )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

