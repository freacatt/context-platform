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
| `services/` | Auth, policy engine, chat/session/execution/planning/orchestration/MCP services, agent CRUD |
| `tools/` | ToolDefinition, AppDefinition, CRUD handler factory, ToolRegistry (8 apps × 5 tools) |
| `tools/apps/` | Per-app registrations (pyramids, product_definitions, technical_architectures, etc.) |
| `api/` | FastAPI routers (HTTP/JSON endpoints) |
| `tests/` | pytest test suite (116 tests) |

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
isDefault: boolean         # true for GM agent
isOrchestrator: boolean    # true for GM, enables delegation
appAccess: [{appId, permissions: ["create","read","update","delete","list"]}]
mcpServers: [{name, url, auth: {type, token/key}}]
orchestratorConfig: {canDelegateToAgents, autoSelectAgent, fallbackBehavior} | null
createdAt: timestamp
updatedAt: timestamp
```

### `sessions/{sessionId}`
```
workspaceId, agentId, userId, title, status ("active"|"paused"|"completed"),
messages: [{id, role ("user"|"assistant"|"tool_call"|"tool_result"), content, timestamp, metadata}],
metadata: {plan?: {goal, status, steps: [...]}},
parentSessionId: string | null,  # set for delegated sub-sessions
createdAt, updatedAt
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
- `POST /agents` — Create agent (with app_access, mcp_servers, orchestrator_config)
- `PUT /agents/{id}` — Update agent config
- `DELETE /agents/{id}` — Delete agent (cannot delete default)

### Sessions
- `POST /sessions` — Create session (supports `chat_only: true` to disable tool execution)
- `GET /sessions?workspace_id={id}&agent_id?&status?` — List sessions
- `GET /sessions/{id}` — Get session with messages
- `POST /sessions/{id}/messages` — Send message → AI response (with tool execution if agent has tools and session is not chat_only)
- `DELETE /sessions/{id}` — Delete session permanently
- `PATCH /sessions/{id}` — Update session status

### Plans
- `GET /sessions/{id}/plan` — Get session plan
- `POST /sessions/{id}/plan/approve` — Approve plan
- `POST /sessions/{id}/plan/execute` — Execute plan steps
- `POST /sessions/{id}/plan/steps/{step_id}/skip` — Skip a step

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

## Session Message Flow (Primary)

1. Frontend sends `POST /sessions/{id}/messages` with message + optional context
2. Agent-platform validates session ownership and active status
3. Stores user message in session, loads agent config
4. If session is `chat_only` → always uses `ChatService` (no tools, pure conversation)
5. If agent has tools (and not chat_only) → `ExecutionService`: builds system prompt with AppDefinitions, binds LangChain tools, runs LLM → tool call loop (max 10 iterations)
6. If agent has no tools → `ChatService`: simple LLM call
7. Stores assistant message, returns response + tool call traces

## Orchestration Flow

1. GM agent receives task → LLM calls `__delegate__` tool
2. `OrchestrationService.find_agents_for_task()` discovers specialists by appAccess
3. `delegate()` creates sub-session (parentSessionId = GM session), executes via specialist agent
4. Result flows back to GM session as delegation trace

## Tool System

- 8 apps × 5 CRUD tools = 40 tools registered in `ToolRegistry` singleton
- Apps: pyramids, product_definitions, technical_architectures, technical_tasks, diagrams, ui_ux_architectures, context_documents, pipelines
- Tool ID format: `{app_id}.{action}` (e.g. `pyramids.create`)
- MCP tool ID format: `mcp:{server_name}:{tool_name}`
- Each app has an `AppDefinition` with description, data schema, usage guidelines — injected into agent system prompts
- GM agent (empty appAccess) gets all tools; custom agents get filtered by appAccess

## Hard Constraints

- No long-lived in-memory state (stateless per request).
- All workspace access verified via PolicyEngine before any operation.
- Snake_case in API (Pydantic) ↔ camelCase in Firestore — conversion handled in API layer.
- NO cross-workspace data access — tool handlers verify workspaceId on every read/update/delete.

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
