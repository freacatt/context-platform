# Agent Platform Backend — Rules

## CRITICAL — Identity & Users

- Firebase Authentication is the ONLY identity provider. `firebase_uid` is canonical user ID.
- User records are NOT stored separately — workspace ownership is tracked via `userId` field on workspace and agent documents in Firestore.
- Guest users MUST NEVER touch Firestore (agent-platform side), Qdrant, or billing.

## CRITICAL — Data Boundaries

| Store | Role | Contains |
|-------|------|----------|
| Firestore | Shared data plane | Workspaces, agents, workspace content — shared between frontend and agent-platform |
| Qdrant | Vector store | Embeddings — separate namespace per workspace, NO cross-workspace search |

**There is no PostgreSQL.** Firestore is the single source of truth for both frontend and agent-platform.

## Architecture

```
Client (SPA) → Firebase Auth → Agent Server (FastAPI)
                                    ↓
                    ┌──────────┬──────────┬──────────┐
                    │  Qdrant  │Firestore │ LLM API  │
                    │(Vectors) │ (Shared) │(External)│
                    └──────────┴──────────┴──────────┘
```

## Package Layout

| Package | Purpose |
|---------|---------|
| `core/` | Settings, Firestore client, structured exceptions |
| `ai/` | LLM/chat model factory, embeddings, RAG, vector store helpers |
| `services/` | Auth, policy engine, chat service, agent CRUD, app registry |
| `api/` | FastAPI routers (HTTP/JSON endpoints) |
| `tests/` | pytest test suite |

## Firestore Collections (Agent-Platform Managed)

### `agents/{agent_id}`
```
workspaceId: string        # references workspace
userId: string             # firebase_uid (owner)
name: string               # "General Manager"
type: string               # "gm" | "custom"
modelMode: "auto" | "manual"
modelProvider: string | null
modelName: string | null
skills: string[]
context: string            # agent system prompt
isDefault: boolean          # true for GM agent
createdAt: timestamp
updatedAt: timestamp
```

### Workspace fields (added by agent-platform)
```
workspaces/{id}
  ... existing frontend fields ...
  gmAgentId: string
  aiRecommendationAgentId: string
  aiChatAgentId: string
```

## API Endpoints

### Health
- `GET /health` → `{"status": "ok"}`

### Workspaces
- `POST /workspaces/setup` — Atomic workspace setup (verify workspace, create Qdrant namespace, create GM agent, update workspace)
- `GET /workspaces/{id}` — Get workspace info

### Agents
- `GET /agents?workspace_id={id}` — List agents for workspace
- `GET /agents/{id}` — Get single agent
- `POST /agents` — Create new custom agent
- `PUT /agents/{id}` — Update agent config
- `DELETE /agents/{id}` — Delete agent (cannot delete default)

### Chat
- `POST /chat` — Stateless chat: send message + agent_id → get LLM response

### Apps
- `GET /apps` — List registered apps

All endpoints require Firebase ID token as `Authorization: Bearer <token>`.

## Workspace Creation Flow

1. Frontend creates workspace in Firestore
2. Frontend calls `POST /workspaces/setup` with workspace_id
3. Agent-platform verifies workspace exists and user owns it
4. Creates Qdrant collection `workspace_{id}`
5. Creates default GM agent in Firestore `agents` collection
6. Updates workspace doc with `gmAgentId`
7. On ANY failure → rolls back (deletes agent doc, deletes Qdrant collection)

## Chat Flow

1. Frontend sends `POST /chat` with workspace_id, agent_id, message, history, context
2. Agent-platform validates workspace ownership
3. Loads agent config from Firestore
4. Builds LangChain chat model using agent's model config
5. Constructs messages: system prompt (agent.context) + history + user message
6. Calls LLM, returns response text + model info
7. Frontend handles message persistence (saves user + assistant messages locally)

## Hard Constraints

- No long-lived in-memory state (stateless per request).
- All workspace access verified via PolicyEngine before any operation.
- Snake_case in API (Pydantic) ↔ camelCase in Firestore — conversion handled in API layer.

## Model Configuration

- Factory in `ai/models.py` via `get_chat_model(config)`.
- Config via env vars: `AGENT_PLATFORM_LLM_PROVIDER`, `AGENT_PLATFORM_LLM_MODEL`, etc.
- Providers: `openai`, `anthropic`, `gemini`, `grok`, `deepseek`.
- MUST call `get_chat_model(config)` — NEVER construct LLM directly.

## Error Handling

Structured errors via `core/exceptions.py`:
- `AppError(code, message, status_code)` — base
- `NotFoundError(resource, resource_id)` — 404
- `ForbiddenError(message)` — 403
- `ConflictError(message)` — 409

API responses on error:
```json
{"ok": false, "error": {"code": "WORKSPACE_NOT_FOUND", "message": "..."}}
```

## Qdrant Rules

- Separate namespace per workspace with metadata filtering.
- Only upsert changed documents. Re-embed on version mismatch only.
- Workspace ID MUST be injected as metadata filter before retrieval.

## Testing

- Tests in `tests/` directory, run with `pytest -v`
- Mocked Firestore, Qdrant, Firebase auth, and LLM
- FastAPI dependency overrides for auth in test fixtures

## Frontend Integration (Bridge Rules)

- SPA communicates via authenticated HTTP/JSON ONLY.
- Every request includes Firebase ID token.
- UI NEVER talks directly to Qdrant or Firestore agent data.
- Agent capabilities derived from server — never hard-coded.
