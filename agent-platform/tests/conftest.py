"""Test fixtures: mock Firebase auth, Firestore, Qdrant, and LLM."""

from collections import defaultdict
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Mock Firestore
# ---------------------------------------------------------------------------

class MockDocumentSnapshot:
    def __init__(self, doc_id: str, data: dict | None):
        self._id = doc_id
        self._data = data

    @property
    def id(self) -> str:
        return self._id

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict | None:
        return self._data


class MockDocumentReference:
    def __init__(self, collection: "MockCollectionReference", doc_id: str):
        self._collection = collection
        self._id = doc_id

    @property
    def id(self) -> str:
        return self._id

    def get(self) -> MockDocumentSnapshot:
        data = self._collection._store.get(self._id)
        return MockDocumentSnapshot(self._id, data)

    def set(self, data: dict) -> None:
        self._collection._store[self._id] = dict(data)

    def update(self, updates: dict) -> None:
        existing = self._collection._store.get(self._id)
        if existing is None:
            raise Exception(f"Document {self._id} not found")
        existing.update(updates)

    def delete(self) -> None:
        self._collection._store.pop(self._id, None)


class MockCollectionReference:
    def __init__(self, name: str, store: dict):
        self._name = name
        self._store = store

    def document(self, doc_id: str | None = None) -> MockDocumentReference:
        if doc_id is None:
            doc_id = str(uuid4())[:20]
        return MockDocumentReference(self, doc_id)

    def where(self, field: str | None = None, op: str | None = None, value=None, *, filter=None) -> "MockQuery":
        if filter is not None:
            # Support FieldFilter(field, op, value) keyword syntax
            field = filter.field_path
            op = filter.op_string
            value = filter.value
        return MockQuery(self._store, field, op, value)

    def order_by(self, field: str) -> "MockQuery":
        return MockQuery(self._store)


class MockQuery:
    def __init__(self, store: dict, field: str | None = None, op: str | None = None, value=None):
        self._store = store
        self._field = field
        self._op = op
        self._value = value

    def order_by(self, field: str) -> "MockQuery":
        return self

    def stream(self):
        results = []
        for doc_id, data in self._store.items():
            if self._field and self._op == "==":
                if data.get(self._field) != self._value:
                    continue
            results.append(MockDocumentSnapshot(doc_id, data))
        return results


class MockFirestoreClient:
    def __init__(self):
        self._collections: dict[str, dict] = defaultdict(dict)

    def collection(self, name: str) -> MockCollectionReference:
        return MockCollectionReference(name, self._collections[name])


# ---------------------------------------------------------------------------
# Mock Qdrant
# ---------------------------------------------------------------------------

class MockQdrantCollections:
    def __init__(self):
        self.collections = []


class MockQdrantCollection:
    def __init__(self, name: str):
        self.name = name


class MockQdrantClient:
    def __init__(self):
        self._collections: set[str] = set()

    def get_collections(self):
        result = MockQdrantCollections()
        result.collections = [MockQdrantCollection(n) for n in self._collections]
        return result

    def create_collection(self, collection_name: str, **kwargs):
        self._collections.add(collection_name)

    def delete_collection(self, collection_name: str):
        self._collections.discard(collection_name)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TEST_FIREBASE_UID = "test-user-uid-123"


@pytest.fixture
def mock_firestore():
    return MockFirestoreClient()


@pytest.fixture
def mock_qdrant():
    return MockQdrantClient()


@pytest.fixture
def seeded_firestore(mock_firestore):
    """Firestore with a pre-existing workspace owned by TEST_FIREBASE_UID."""
    ws_id = "test-workspace-id"
    mock_firestore._collections["workspaces"][ws_id] = {
        "userId": TEST_FIREBASE_UID,
        "name": "Test Workspace",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "lastModified": datetime.now(timezone.utc).isoformat(),
    }
    return mock_firestore


@pytest.fixture
def client(seeded_firestore, mock_qdrant):
    """FastAPI TestClient with all external deps mocked."""
    from services.auth import AuthedUser, get_current_user

    mock_user = AuthedUser(firebase_uid=TEST_FIREBASE_UID)

    # Patch get_firestore_client everywhere it's imported
    patches = [
        patch("core.firestore.get_firestore_client", return_value=seeded_firestore),
        patch("api.workspaces.get_firestore_client", return_value=seeded_firestore),
        patch("api.agents.get_firestore_client", return_value=seeded_firestore),
        patch("api.apps.get_firestore_client", return_value=seeded_firestore),
        patch("api.recommend.get_firestore_client", return_value=seeded_firestore),
        patch("api.sessions.get_firestore_client", return_value=seeded_firestore),
        patch("api.plans.get_firestore_client", return_value=seeded_firestore),
        patch("api.workspaces.get_qdrant_client", return_value=mock_qdrant),
        patch("api.workspaces.ensure_workspace_collection", side_effect=lambda c, wid, vs: c.create_collection(f"workspace_{wid}")),
    ]

    for p in patches:
        p.start()

    from main import app

    # Override FastAPI dependency for auth
    app.dependency_overrides[get_current_user] = lambda: mock_user

    yield TestClient(app)

    # Cleanup
    app.dependency_overrides.clear()
    for p in patches:
        p.stop()
