from collections.abc import Iterable
from typing import Protocol
from uuid import UUID, uuid4

from qdrant_client.models import PointStruct

from ai.vector_store.qdrant_client import (
    ensure_workspace_collection,
    get_qdrant_client,
    upsert_workspace_points,
    search_workspace_points,
)
from ai.models import get_embeddings_model


class EmbeddingProvider(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]:
        ...


class RagService:
    def __init__(self, embedding_provider: EmbeddingProvider, vector_size: int):
        self.embedding_provider = embedding_provider
        self.vector_size = vector_size

    def index_documents(
        self,
        workspace_id: UUID,
        documents: Iterable[tuple[str, dict]],
    ) -> None:
        client = get_qdrant_client()
        ensure_workspace_collection(client, workspace_id, self.vector_size)
        texts = [text for text, _ in documents]
        vectors = self.embedding_provider.embed(texts)
        points: list[PointStruct] = []
        for (text, metadata), vector in zip(documents, vectors, strict=True):
            payload = {"text": text}
            payload.update(metadata)
            points.append(
                PointStruct(
                    id=str(uuid4()),
                    vector=vector,
                    payload=payload,
                )
            )
        upsert_workspace_points(client, workspace_id, points)

    def search(
        self,
        workspace_id: UUID,
        query: str,
        workspace_filter: dict | None = None,
        limit: int = 5,
    ):
        client = get_qdrant_client()
        query_vector = self.embedding_provider.embed([query])[0]
        return search_workspace_points(
            client=client,
            workspace_id=workspace_id,
            vector=query_vector,
            workspace_filter=workspace_filter,
            limit=limit,
        )


class LangchainEmbeddingProvider:
    def __init__(self):
        self._embeddings = get_embeddings_model()

    def embed(self, texts: list[str]) -> list[list[float]]:
        return self._embeddings.embed_documents(texts)


def create_rag_service(vector_size: int) -> RagService:
    provider = LangchainEmbeddingProvider()
    return RagService(embedding_provider=provider, vector_size=vector_size)

