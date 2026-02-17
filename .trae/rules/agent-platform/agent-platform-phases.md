---
alwaysApply: false
description: Step-by-step implementation roadmap for the Agent Platform, covering repository boundaries, auth, control-plane data model, workspace lifecycle, data plane wiring, core server modules, interaction modes, SPA integration, and multi-tenant security checks.
---
# Agent Platform Implementation Phases

This document breaks down the agent platform implementation into concrete phases.  
Each phase aligns with the architecture and rules defined in `agent-platform-overview.md`.

---

## Phase 1: Establish Repository Boundaries

- Implement the Agent Orchestration Server as a FastAPI modular monolith under the `agent-platform/` directory.  
- Keep the React 19 + TypeScript SPA in `src/` as a pure client that only communicates with the Agent Server via authenticated HTTP/JSON APIs.  
- Ensure the frontend never connects directly to PostgreSQL, Qdrant, or any other control-plane infrastructure.

---

## Phase 2: Identity & Auth Boundary

- Use Firebase Authentication as the identity provider for both the SPA and the Agent Server.  
- Treat `firebase_uid` as the canonical user identifier across the entire system.  
- In the Agent Server, validate Firebase ID tokens on every request and attach `firebase_uid` to the request context for downstream modules.

---

## Phase 3: Control Plane (PostgreSQL)

- Provision PostgreSQL as the control-plane database, not as the workspace data store.  
- Create the schema with at least the following tables:  
  - `users`  
  - `workspaces`  
  - `agents`  
  - `agent_permissions`  
  - `conversations`  
  - `messages`  
  - `usage_logs`  
  - `workspace_index_status`  
- Use PostgreSQL strictly for control-plane concerns: permissions, usage tracking, billing support, conversation persistence, workspace ownership, plan enforcement, and RAG indexing state.  
- Keep workspace content in Firestore and embeddings in Qdrant; do not store them in PostgreSQL.

---

## Phase 4: User Creation, Guest Rules & Workspace Flow

- Implement lazy user provisioning: create a `users` row in PostgreSQL only when a user creates their first workspace.  
- Ensure authentication alone (sign-in) never writes to PostgreSQL.  
- For guest users (no Firebase token), prevent any PostgreSQL writes (no `users`, `workspaces`, `conversations`, or `usage_logs` rows).  
- Add a workspace creation endpoint in the Agent Server that:  
  - Validates the Firebase token.  
  - Extracts `firebase_uid`.  
  - Creates a `users` row if needed.  
  - Creates a `workspaces` row linked to that user.  
  - Initializes `workspace_index_status`.  
  - Returns the workspace.  
- Treat this endpoint as the only path that creates `users` records in PostgreSQL.

---

## Phase 5: Data Plane Wiring (Firestore & Qdrant)

- Use Firestore as the primary workspace data plane for structured application objects and workspace content.  
- Ensure agents never talk directly to Firestore; route any agent-originated writes through the Policy Engine.  
- Configure Qdrant with separate collections or namespaces per workspace and metadata filtering.  
- Enforce the following Qdrant rules:  
  - No cross-workspace search.  
  - Only upsert changed documents.  
  - Re-embed documents only on version mismatch or when documents change.

---

## Phase 6: Agent Server Core Modules

- Implement API routing, Firebase token validation, and request lifecycle management in the FastAPI layer.  
- Implement the following core modules:  
  - General Manager (GM)  
  - Domain Agents  
  - RAG Service  
  - Policy Engine  
  - Usage Tracker  
  - Conversation Manager  
- Enforce:  
  - Statelessness (no long-lived in-memory state).  
  - Isolation of agents from direct Firestore access.  
  - Logging of all critical actions and orchestration steps.

---

## Phase 7: Agent Interaction Modes

- **Direct Agent Mode**:  
  - Implement endpoints that route user prompts to a selected agent (with optional RAG) without delegation for lower latency and cost.  
  - Use this mode for focused tasks or specialist queries.  
- **GM-Orchestrated Mode**:  
  - Implement endpoints that send user tasks to the GM, perform task decomposition, delegate work to domain agents, aggregate results, and enforce permission checks on each delegation.  
  - Ensure all inter-agent communication flows through the GM; agents must not call each other directly.

---

## Phase 8: SPA Integration & Experience Modes

- Update the React SPA to attach Firebase ID tokens to all Agent Server requests.  
- Use the Agent Server for:  
  - Workspace creation.  
  - Agent conversations (direct and GM).  
  - Conversation history.  
  - Usage and plan information for authenticated users.  
- Continue to use the existing `storage` adapter (Dexie + Firestore) for local app data, while treating the Agent Server as the gateway to PostgreSQL, Qdrant, and other control-plane functions.  
- Enforce Guest vs SaaS behavior in the UI:  
  - In Guest Mode (no Firebase token), keep all data local and disable or reroute flows that rely on PostgreSQL workspaces or control-plane features.  
  - In Authenticated Mode, enable workspace creation and control-plane features by calling the Agent Server.  
  - Ensure UI interactions that would touch control-plane resources are only available when authenticated.

---

## Phase 9: Security & Multi-Tenancy Validation

- Verify that PostgreSQL contains only authenticated, persistent users.  
- Confirm that guest mode never touches PostgreSQL, Qdrant, or billing-related systems.  
- Enforce workspace ownership and access checks based on `firebase_uid` on all relevant endpoints.  
- Confirm that RAG operations are strictly workspace-scoped with no cross-tenant leakage.  
- Ensure the system remains stateless and horizontally scalable.  
- Verify that all critical orchestration steps and agent actions are logged for audit and cost control.

