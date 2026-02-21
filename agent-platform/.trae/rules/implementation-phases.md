---
alwaysApply: false
applyMode: intelligence
description: Step-by-step implementation roadmap for the Agent Platform backend.
globs:
  - "agent-platform/**"
---
# Agent Platform Implementation Phases

Each phase aligns with the architecture in `backend-architecture.md`.

## Phase 1: Repository Boundaries
- FastAPI modular monolith under `agent-platform/`.
- React SPA in `app/src/` communicates ONLY via HTTP/JSON APIs.
- Frontend NEVER connects to PostgreSQL, Qdrant, or control-plane directly.

## Phase 2: Identity & Auth
- Firebase Auth as identity provider for SPA and Agent Server.
- `firebase_uid` as canonical identifier system-wide.
- Validate Firebase ID tokens on every Agent Server request.

## Phase 3: Control Plane (PostgreSQL)
- Tables: `users`, `workspaces`, `agents`, `agent_permissions`, `conversations`, `messages`, `usage_logs`, `workspace_index_status`.
- PostgreSQL strictly for control-plane: permissions, usage, billing, conversations, ownership, plan enforcement, RAG indexing state.
- Workspace content in Firestore, embeddings in Qdrant — NOT in PostgreSQL.

## Phase 4: User Creation & Guest Rules
- Lazy provisioning: create `users` row ONLY on first workspace creation.
- Authentication alone NEVER writes to PostgreSQL.
- Guest users (no Firebase token): NO PostgreSQL writes of any kind.
- Workspace creation endpoint is the ONLY path that creates user records.

## Phase 5: Data Plane (Firestore & Qdrant)
- Firestore as workspace data plane. Agents NEVER access Firestore directly.
- Qdrant: separate namespace per workspace, metadata filtering, no cross-workspace search.

## Phase 6: Agent Server Core Modules
- Implement: GM, Domain Agents, RAG Service, Policy Engine, Usage Tracker, Conversation Manager.
- Enforce: statelessness, agent isolation from Firestore, logging of all critical actions.

## Phase 7: Agent Interaction Modes
- Direct Agent Mode: single agent + optional RAG, lower latency/cost.
- GM-Orchestrated Mode: task decomposition + delegation + aggregation. Agents MUST NOT call each other.

## Phase 8: SPA Integration
- Attach Firebase ID tokens to all Agent Server requests.
- Use Agent Server for: workspaces, conversations, history, usage.
- Continue using `storage` adapter for local app data.
- Guest Mode: local-only, disable control-plane features. Auth Mode: enable workspace + control-plane.

## Phase 9: Security Validation
- Verify: only authenticated users in PostgreSQL, guest isolation, workspace ownership checks, RAG workspace scoping, statelessness, audit logging.
