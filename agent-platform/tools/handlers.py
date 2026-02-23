"""Generic CRUD handler factory for app tools."""

import json
from datetime import datetime, timezone
from typing import Callable

from google.cloud.firestore_v1.base_query import FieldFilter


class _DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects."""
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def _make_json_safe(obj):
    """Convert an object to be JSON-serializable (datetimes → ISO strings)."""
    return json.loads(json.dumps(obj, cls=_DateTimeEncoder))


def make_crud_handlers(
    collection_name: str,
    app_id: str,
    create_defaults: dict | None = None,
    updatable_fields: set[str] | None = None,
) -> dict[str, Callable]:
    """Generate standard CRUD handlers for a Firestore collection.

    Each handler: (db, workspace_id, user_id, params) -> dict
    """

    def create_handler(db, workspace_id, user_id, params):
        ref = db.collection(collection_name).document()
        now = datetime.now(timezone.utc)
        doc = {
            "userId": user_id,
            "workspaceId": workspace_id,
            "createdAt": now,
            "updatedAt": now,
            **(create_defaults or {}),
            **params,
        }
        ref.set(doc)
        return {"success": True, "id": ref.id, "document": _make_json_safe(doc)}

    def read_handler(db, workspace_id, user_id, params):
        doc_id = params.get("id")
        if not doc_id:
            return {"success": False, "error": "Missing document id"}
        ref = db.collection(collection_name).document(doc_id)
        doc = ref.get()
        if not doc.exists:
            return {"success": False, "error": f"{app_id} '{doc_id}' not found"}
        data = doc.to_dict()
        if data.get("workspaceId") != workspace_id:
            return {"success": False, "error": "Document does not belong to this workspace"}
        data["id"] = doc.id
        return {"success": True, "document": _make_json_safe(data)}

    def update_handler(db, workspace_id, user_id, params):
        doc_id = params.get("id")
        if not doc_id:
            return {"success": False, "error": "Missing document id"}
        ref = db.collection(collection_name).document(doc_id)
        doc = ref.get()
        if not doc.exists:
            return {"success": False, "error": f"{app_id} '{doc_id}' not found"}
        data = doc.to_dict()
        if data.get("workspaceId") != workspace_id:
            return {"success": False, "error": "Document does not belong to this workspace"}
        updates = {k: v for k, v in params.items() if k != "id"}
        if updatable_fields:
            updates = {k: v for k, v in updates.items() if k in updatable_fields}
        updates["updatedAt"] = datetime.now(timezone.utc)
        ref.update(updates)
        return {"success": True, "id": doc_id, "updated_fields": list(updates.keys())}

    def delete_handler(db, workspace_id, user_id, params):
        doc_id = params.get("id")
        if not doc_id:
            return {"success": False, "error": "Missing document id"}
        ref = db.collection(collection_name).document(doc_id)
        doc = ref.get()
        if not doc.exists:
            return {"success": False, "error": f"{app_id} '{doc_id}' not found"}
        data = doc.to_dict()
        if data.get("workspaceId") != workspace_id:
            return {"success": False, "error": "Document does not belong to this workspace"}
        ref.delete()
        return {"success": True, "id": doc_id}

    def list_handler(db, workspace_id, user_id, params):
        query = db.collection(collection_name).where(
            filter=FieldFilter("workspaceId", "==", workspace_id)
        )
        results = []
        for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)
        return {"success": True, "count": len(results), "documents": _make_json_safe(results)}

    return {
        "create": create_handler,
        "read": read_handler,
        "update": update_handler,
        "delete": delete_handler,
        "list": list_handler,
    }
