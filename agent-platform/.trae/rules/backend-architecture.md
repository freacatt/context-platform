---
alwaysApply: false
applyMode: intelligence
description: Architecture and rules for the Agent Platform backend (FastAPI, PostgreSQL, Qdrant).
globs:
  - "agent-platform/**"
---
# Agent Platform Backend Architecture

## CRITICAL — Identity & Users

- Firebase Authentication is the ONLY identity provider. `firebase_uid` is the canonical user ID.
- PostgreSQL does NOT generate its own user IDs — uses `firebase_uid`.
- User records created ONLY when user creates their first workspace (lazy provisioning).
- Authentication alone MUST NEVER create a DB user.
- Guest users MUST NEVER touch PostgreSQL, Qdrant, or billing systems.

## CRITICAL — Data Boundaries

| Store | Role | Contains |
|-------|------|----------|
| PostgreSQL | Control plane | Users, workspaces, agents, permissions, conversations, messages, usage_logs, workspace_index_status |
| Firestore | Data plane | Workspace content, application objects — accessed ONLY via App Service layer |
| Qdrant | Vector store | Embeddings — separate namespace per workspace, NO cross-workspace search |

## Architecture Diagram

```
Client (SPA) → Firebase Auth → Agent Server (FastAPI)
                                    ↓
                    ┌──────────┬──────────┬──────────┬──────────┐
                    │PostgreSQL│  Qdrant  │Firestore │ LLM API  │
                    │(Control) │(Vectors) │(Workspace)│(External)│
                    └──────────┴──────────┴──────────┴──────────┘
```

## Package Layout

| Package | Purpose |
|---------|---------|
| `core/` | Settings, SQLAlchemy engine/session, ORM models |
| `ai/` | LLM/chat, embeddings, RAG, vector store helpers |
| `services/` | Auth, policy, app registry, conversations, usage |
| `api/` | FastAPI routers (HTTP/JSON endpoints) |
| `migrations/` | Alembic database migrations |

MUST import from structured packages (`core`, `ai`, `services`, `api`). Top-level modules (`config.py`, `db.py`, `models.py`, etc.) are legacy shims — do not add new imports from them.

## MUST — Documentation Sync

For any `agent-platform/` change, keep in sync:
- `agent-platform/README.md`
- `.trae/rules/backend-architecture.md`
- `.trae/rules/implementation-phases.md`

## Agent Interaction Modes

**Direct Agent Mode**: User → Agent → Optional RAG → Response. Single agent, lower latency/cost.

**GM-Orchestrated Mode**: User → GM → Task Decomposition → Delegate to Agents → Aggregate → Response. Multi-agent, higher cost.

- Agents MUST NOT call each other directly — all cross-agent communication through GM.
- Permission checks MUST occur before each delegation.

## Workspace Creation Flow

1. Validate Firebase token → extract `firebase_uid`
2. Check if user exists in PostgreSQL
3. If NOT: create user record → create workspace → init `workspace_index_status`
4. Return workspace

This is the ONLY path that creates user records.

## Agent Server Hard Constraints

- No long-lived in-memory state (stateless).
- Agents MUST NOT access Firestore directly — route through App Service + Policy Engine.
- All critical actions logged.
- All app access goes through `app_services.py` and Policy Engine.

## App Service API

- Internal app services: `agent-platform/app_services.py`
- Public endpoints:
  - `GET /apps` — list registered apps
  - `GET /apps/workspaces/{workspace_id}/permissions` — all app permissions
  - `GET /apps/workspaces/{workspace_id}/{app_id}/permissions` — single app permissions

## PostgreSQL Key Tables

| Table | Key Rule |
|-------|----------|
| `users` | Created ONLY on first workspace. `firebase_uid` unique. No guest records. |
| `workspaces` | Cannot exist without a user. No guest workspaces. |
| `conversations` / `messages` | Persisted for authenticated users only. |
| `usage_logs` | No guest usage logged. |

## Qdrant Rules

- Separate namespace per workspace with metadata filtering.
- Only upsert changed documents. Re-embed on version mismatch only.
- Workspace ID MUST be injected as metadata filter before any retrieval.
