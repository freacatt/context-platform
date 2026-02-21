from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, PointStruct, VectorParams, Distance

from core.config import settings


def _build_qdrant_client() -> QdrantClient:
    return QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        prefer_grpc=False,
    )


def get_qdrant_client() -> QdrantClient:
    return _build_qdrant_client()


def ensure_workspace_collection(client: QdrantClient, workspace_id: str, vector_size: int) -> None:
    collection_name = f"workspace_{workspace_id}"
    collections = client.get_collections()
    if any(c.name == collection_name for c in collections.collections):
        return
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )


def upsert_workspace_points(
    client: QdrantClient,
    workspace_id: str,
    points: list[PointStruct],
) -> None:
    collection_name = f"workspace_{workspace_id}"
    client.upsert(collection_name=collection_name, points=points)


def search_workspace_points(
    client: QdrantClient,
    workspace_id: str,
    vector: list[float],
    workspace_filter: dict | None = None,
    limit: int = 10,
):
    collection_name = f"workspace_{workspace_id}"
    must_conditions: list[FieldCondition] = []
    workspace_filter = workspace_filter or {}
    for key, value in workspace_filter.items():
        must_conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
    return client.search(
        collection_name=collection_name,
        query_vector=vector,
        query_filter=Filter(must=must_conditions) if must_conditions else None,
        limit=limit,
    )
