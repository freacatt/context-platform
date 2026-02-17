# Agent Platform (FastAPI Server)

This directory contains the Agent Platform backend: a FastAPI server that powers agents, orchestration, RAG, and control‑plane features for the Context Platform  / Context Platform SPA.

The React app in `src/` stays a pure client. It talks to this server over authenticated HTTP/JSON APIs; it never connects directly to PostgreSQL or Qdrant.

---

## Why this directory exists

The repository has two main pieces:
- `src/` – React 19 + TypeScript SPA (browser client)
- `agent-platform/` – FastAPI server (agent orchestration + control plane)

This keeps backend concerns (auth boundary, workspaces, usage, RAG, multi‑tenant safety) completely isolated from the frontend code and from the Dexie/Firestore storage adapter used by the SPA.

You can deploy and scale the Agent Platform separately from the web app, while both still live in the same monorepo.

---

## Why everything is directly in `agent-platform/` now

Originally, the Python code lived under:

```text
agent-platform/
  agentplatform/
    main.py
    models.py
    db.py
    ...
```

That extra `agentplatform/` package added an unnecessary level of nesting and made it harder to see what the server actually consists of.

The layout is now flattened:

```text
agent-platform/
  main.py
  auth.py
  config.py
  db.py
  models.py
  deps.py
  agents.py
  policy_engine.py
  usage_tracker.py
  conversation_manager.py
  rag_service.py
  qdrant_client_adapter.py
  api/
    __init__.py
    workspaces.py
    conversations.py
  .env           (local settings, not committed)
```

Benefits of this layout:
- Easier to navigate: all core server modules are visible at a glance.
- Simpler to run: you can start the server with `uvicorn main:app` from inside `agent-platform/`.
- Fewer path surprises: imports are straightforward (`from models import User`, `from api.workspaces import router`).
- The top‑level directory name (`agent-platform`) is clearly tied to the role this folder plays in the monorepo.

---

## Core responsibilities

The Agent Platform is the control‑plane and orchestration backend. At a high level it is responsible for:

- **Identity boundary**
  - Validates Firebase ID tokens on every request.
  - Treats `firebase_uid` as the canonical user identifier.

- **Control‑plane database (PostgreSQL)**
  - Stores users, workspaces, agents, permissions, conversations, messages, usage logs, and workspace index status.
  - Only authenticated users ever get rows in PostgreSQL (guest mode remains local‑only in the SPA).

- **RAG + vector store (Qdrant)**
  - Creates per‑workspace collections in Qdrant.
  - Indexes documents via embeddings and runs workspace‑scoped similarity search.

- **Agent orchestration**
  - Provides endpoints for:
    - Direct agent calls (low‑latency, no delegation).
    - GM‑orchestrated tasks (task decomposition + delegation to domain agents).
  - Ensures all inter‑agent work is mediated by the General Manager and Policy Engine.

- **Policy + usage**
  - Enforces workspace ownership and permissions on every sensitive operation.
  - Logs usage events to support billing and cost visibility.

---

## Module overview

- `main.py` – FastAPI application instance and router wiring.
- `auth.py` – Firebase ID token validation and `AuthedUser` model.
- `config.py` – Environment‑driven settings (PostgreSQL URL, Qdrant URL, Qdrant API key, LLM provider, etc.).
- `db.py` – SQLAlchemy engine, session factory, and Base.
- `models.py` – SQLAlchemy models for users, workspaces, agents, conversations, messages, usage logs, and index status.
- `deps.py` – FastAPI dependency for database sessions.
- `agents.py` – Agent protocol, simple `EchoAgent`, and `GeneralManager` entry point.
- `policy_engine.py` – Workspace ownership and permission checks.
- `usage_tracker.py` – Usage logging to PostgreSQL.
- `conversation_manager.py` – Conversation and message creation/listing.
- `ai_models.py` – Unified LangChain chat and embeddings models configured from environment.
- `rag_service.py` – RAG indexing and search over Qdrant, using the unified embeddings model.
- `qdrant_client_adapter.py` – Thin wrapper around Qdrant client with workspace‑scoped collections and API key support.
- `app_services.py` – App registry and per‑app permission calculations.
- `api/workspaces.py` – Workspace creation API (lazy user provisioning, workspace index status setup).
- `api/conversations.py` – Conversation CRUD and agent interaction endpoints (direct agent + GM‑orchestrated).
- `api/apps.py` – App registry and per‑workspace app permissions API.

---

## Environment configuration

Environment variables are read via `AGENT_PLATFORM_` prefix. A starter config lives in `.env.example` inside `agent-platform/`. Typical keys:

- Core:
  - `AGENT_PLATFORM_DATABASE_URL=postgresql+psycopg2://user:password@localhost/context_platform`
- Qdrant:
  - `AGENT_PLATFORM_QDRANT_URL=http://localhost:6333`
  - `AGENT_PLATFORM_QDRANT_API_KEY=` (for Qdrant Cloud or secured instances)
- Unified LLM (LangChain):
  - `AGENT_PLATFORM_LLM_PROVIDER=anthropic` (or `openai`)
  - `AGENT_PLATFORM_LLM_MODEL=claude-3-5-sonnet-20241022` (or an OpenAI model like `gpt-4.1-mini`)
- Unified embeddings:
  - `AGENT_PLATFORM_EMBEDDINGS_PROVIDER=anthropic` (or `openai`)
  - `AGENT_PLATFORM_EMBEDDINGS_MODEL=text-embedding-3-large` (or `text-embedding-3-large` for OpenAI)
- Provider API keys:
  - `AGENT_PLATFORM_ANTHROPIC_API_KEY=...`
  - `AGENT_PLATFORM_OPENAI_API_KEY=...`

Copy `.env.example` to `.env` and fill in real credentials for your environment.

---

## Running the server locally

From the repository root:

```bash
cd agent-platform
uvicorn main:app --reload
```

Prerequisites (typical):
- Python 3.12+
- Dependencies like `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary`, `pydantic`, `firebase_admin`, `qdrant-client`.

The React SPA should call this server using the base URL configured via `VITE_AGENT_SERVER_URL` on the frontend and attach Firebase ID tokens to each request.
