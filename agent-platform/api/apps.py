from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.firestore import get_firestore_client
from services.app_services import AppPermission, get_workspace_app_permissions, list_registered_apps
from services.auth import AuthedUser, get_current_user


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
    workspace_id: str
    apps: list[AppPermissionResponse]


@router.get("", response_model=list[AppDescriptor])
def list_apps() -> list[AppDescriptor]:
    return [
        AppDescriptor(id=app.value, label=app.value.replace("_", " ").title())
        for app in list_registered_apps()
    ]


@router.get("/workspaces/{workspace_id}/permissions", response_model=WorkspacePermissionsResponse)
def get_workspace_permissions(
    workspace_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> WorkspacePermissionsResponse:
    db = get_firestore_client()
    permissions = get_workspace_app_permissions(db, current_user.firebase_uid, workspace_id)
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
    workspace_id: str,
    app_id: str,
    current_user: AuthedUser = Depends(get_current_user),
) -> AppPermissionResponse:
    db = get_firestore_client()
    permissions = get_workspace_app_permissions(db, current_user.firebase_uid, workspace_id)
    for p in permissions:
        if p.app_id.value == app_id:
            return AppPermissionResponse(
                app_id=p.app_id.value,
                can_read=p.can_read,
                can_write=p.can_write,
                reason=p.reason,
            )
    from core.exceptions import NotFoundError
    raise NotFoundError("app", app_id)
