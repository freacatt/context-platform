# Agent Platform (FastAPI Server)

FastAPI backend that powers agent orchestration, RAG (Qdrant), and AI chat for the Context Platform SPA.

The React app in `app/` is a pure client — it talks to this server over authenticated HTTP/JSON APIs and never connects directly to Qdrant.

---

## Architecture

```
Client (SPA) → Firebase Auth → Agent Server (FastAPI)
                                    ↓
                    ┌──────────┬──────────┬──────────┐
                    │  Qdrant  │Firestore │ LLM API  │
                    │(Vectors) │ (Shared) │(External)│
                    └──────────┴──────────┴──────────┘
```

- **Frontend:** React 19 + TypeScript SPA in `app/`
  - Uses `VITE_AGENT_SERVER_URL` to talk to this server
  - Attaches Firebase ID tokens as `Authorization: Bearer <idToken>`
- **Backend (this folder):** FastAPI service
  - HTTP/JSON API only, no server-side templates
  - Auth boundary, workspace setup, agent management, chat
- **Firestore:**
  - Shared data store between frontend and agent-platform
  - Workspaces, agents, workspace content
- **Qdrant:**
  - Per-workspace vector collections for semantic search and RAG
- **LLM + embeddings:**
  - Multi-provider support: Anthropic, OpenAI, Gemini, Grok, DeepSeek
  - Configured via `AGENT_PLATFORM_LLM_*` and `AGENT_PLATFORM_EMBEDDINGS_*`

---

## Directory layout

```
agent-platform/
  main.py                  # FastAPI app, CORS, routers, exception handlers
  core/
    config.py              # Settings / env configuration
    firestore.py           # Firestore client initialization (firebase_admin)
    exceptions.py          # Structured error types (AppError, NotFoundError, etc.)
    __init__.py
  ai/
    models.py              # Unified LLM and embeddings model factory
    rag.py                 # RAG service using LangChain embeddings
    vector_store/
      qdrant_client.py     # Qdrant client helpers (per-workspace collections)
  services/
    auth.py                # Firebase ID token validation and AuthedUser model
    agents.py              # Agent CRUD (Firestore-backed)
    chat_service.py        # LLM chat orchestration via LangChain
    session_service.py     # Server-side session CRUD and message management
    execution_service.py   # Agent execution loop with LLM tool-calling
    permission_service.py  # Per-agent per-app access control
    planning_service.py    # Chain-of-thought planning and step execution
    orchestration_service.py # Agent-to-agent delegation via sub-sessions
    mcp_client.py          # External MCP server connectivity
    policy_engine.py       # Workspace ownership / permission checks (Firestore)
    app_services.py        # App registry and permissions
  tools/
    base.py                # ToolDefinition, AppDefinition, ToolAction
    handlers.py            # Generic CRUD handler factory for Firestore apps
    registry.py            # ToolRegistry singleton (8 apps × 5 tools)
    apps/                  # Per-app tool + definition registrations
      pyramids.py, product_definitions.py, technical_architectures.py,
      technical_tasks.py, diagrams.py, ui_ux_architectures.py,
      context_documents.py, pipelines.py
  api/
    workspaces.py          # POST /workspaces/setup, GET /workspaces/{id}
    agents.py              # Agent CRUD endpoints (with app access, MCP, orchestrator config)
    sessions.py            # Session CRUD + message send with tool execution
    plans.py               # Plan CRUD, approval, execution, step skip
    chat.py                # POST /chat (stateless prompt → LLM response)
    apps.py                # GET /apps
  tests/
    conftest.py            # Test fixtures (mock Firestore, Qdrant, auth, LLM)
    test_workspaces.py     # Workspace setup tests
    test_agents.py         # Agent CRUD tests
    test_chat.py           # Chat endpoint tests
    test_sessions.py       # Session CRUD and messaging tests
    test_execution.py      # Tool execution loop tests
    test_permissions.py    # Permission service tests
    test_planning.py       # Planning service tests
    test_orchestration.py  # Agent-to-agent delegation tests
    test_tool_registry.py  # Tool registry tests
    test_tool_handlers.py  # CRUD handler tests
    test_mcp.py            # MCP client tests
  docker-compose.yml       # Qdrant only
  requirements.txt
  .env                     # Local settings (not committed)
```

---

## Features

- **Workspace setup** — Atomic initialization with rollback (Qdrant namespace + GM agent + workspace update)
- **Agent management** — CRUD for AI agents with model configuration, app access, MCP servers, orchestrator config
- **Server-side sessions** — Conversation state with message history, status transitions, title generation
- **Tool execution** — LLM tool-calling loop with permission checks against 8 app × 5 CRUD tools (40 total)
- **Chain-of-thought planning** — Structured multi-step plans with approval workflow and step-by-step execution
- **Agent orchestration** — GM delegates tasks to specialist agents via sub-sessions based on app access
- **External MCP** — Per-agent connectivity to external MCP servers with tool discovery and namespaced tool IDs
- **Permission system** — Fine-grained per-agent per-app access control (GM gets all, custom agents get filtered)
- **Stateless chat** — Backward-compatible `POST /chat` endpoint (frontend manages conversation persistence)
- **Policy engine** — Workspace ownership verification on every operation
- **Multi-provider LLM** — Anthropic, OpenAI, Gemini, Grok, DeepSeek via LangChain
- **RAG** — Per-workspace Qdrant collections for semantic search
- **Structured errors** — Typed error codes with consistent JSON responses

---

## HTTP API

All endpoints require `Authorization: Bearer <FIREBASE_ID_TOKEN>`.

### Health
- `GET /health` → `{"status": "ok"}`

### Workspaces

- `POST /workspaces/setup`
  - **Body:** `{ "workspace_id": "string", "name": "string" }`
  - **Behavior:** Verifies workspace → creates Qdrant collection → creates GM agent → updates workspace
  - **Response:** `{ "workspace_id": "string", "gm_agent_id": "string" }`

- `GET /workspaces/{workspace_id}`
  - **Response:** `{ "id", "name", "gm_agent_id", "ai_recommendation_agent_id", "ai_chat_agent_id" }`

### Agents

- `GET /agents?workspace_id={id}` — List agents for workspace
- `GET /agents/{agent_id}` — Get single agent
- `POST /agents` — Create agent with app access, MCP servers, orchestrator config
- `PUT /agents/{agent_id}` — Update agent fields
- `DELETE /agents/{agent_id}` — Delete (cannot delete default GM agent)

### Sessions

- `POST /sessions` — Create session (`{ "workspace_id", "agent_id", "title?" }`)
- `GET /sessions?workspace_id={id}&agent_id?&status?` — List sessions
- `GET /sessions/{id}` — Get session with messages
- `POST /sessions/{id}/messages` — Send message → get AI response (with tool execution)
- `PATCH /sessions/{id}` — Update session status (active/paused/completed)

### Plans

- `GET /sessions/{id}/plan` — Get current plan
- `POST /sessions/{id}/plan/approve` — Approve plan for execution
- `POST /sessions/{id}/plan/execute` — Execute approved plan
- `POST /sessions/{id}/plan/steps/{step_id}/skip` — Skip a plan step

### Chat (Legacy)

- `POST /chat`
  - **Body:** `{ "workspace_id", "agent_id", "message", "history": [], "context": "optional" }`
  - **Response:** `{ "response": "AI text", "agent_id": "string", "model": "string" }`

### Apps

- `GET /apps` — List registered apps

---

## Environment configuration

Environment variables use `AGENT_PLATFORM_` prefix. Copy `.env.example` to `.env`.

| Variable | Description |
|----------|-------------|
| `AGENT_PLATFORM_QDRANT_URL` | Qdrant server URL (default: `http://localhost:6333`) |
| `AGENT_PLATFORM_QDRANT_API_KEY` | Qdrant API key (optional) |
| `AGENT_PLATFORM_FIREBASE_CREDENTIALS_PATH` | Path to Firebase service account JSON (optional — uses `GOOGLE_APPLICATION_CREDENTIALS` otherwise) |
| `AGENT_PLATFORM_LLM_PROVIDER` | LLM provider: `anthropic`, `openai`, `gemini`, `grok`, `deepseek` |
| `AGENT_PLATFORM_LLM_MODEL` | Model name (e.g., `claude-3-5-sonnet-20241022`) |
| `AGENT_PLATFORM_EMBEDDINGS_PROVIDER` | Embeddings provider |
| `AGENT_PLATFORM_EMBEDDINGS_MODEL` | Embeddings model name |
| `AGENT_PLATFORM_ANTHROPIC_API_KEY` | Anthropic API key |
| `AGENT_PLATFORM_OPENAI_API_KEY` | OpenAI API key |
| `AGENT_PLATFORM_CORS_ORIGINS` | Allowed CORS origins (default: `http://localhost:5173`) |

---

## Docker Compose

Only Qdrant runs in Docker:

```bash
cd agent-platform
docker-compose up -d
```

This starts:
- **Qdrant** on port 6333 (HTTP + dashboard at `/dashboard`) and 6334 (gRPC)

---

## Running locally

```bash
cd agent-platform
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start Qdrant
docker-compose up -d

# Start the server
uvicorn main:app --reload
```

Prerequisites:
- Python 3.12+
- Firebase service account credentials configured
- Required API keys in `.env`

---

## Running tests

```bash
cd agent-platform
source venv/bin/activate
pytest -v
```

Tests mock all external dependencies (Firestore, Qdrant, Firebase Auth, LLM).
