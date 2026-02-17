---
alwaysApply: false
description: Architectural overview of the multi-tenant Agent Platform, covering identity rules, control-plane and data-plane separation (PostgreSQL, Firestore, Qdrant), the FastAPI Agent Server modules, and how the React SPA integrates with them.
---
# 1. Overview

This document describes the complete technical architecture of the Context Platform — a multi-agent AI orchestration system deployed on **:contentReference[oaicite:0]{index=0}** and integrated with **:contentReference[oaicite:1]{index=1}**.

The platform enables:

- Direct user-to-agent interaction  
- GM-based orchestration  
- Multi-agent collaboration (via GM)  
- Workspace-isolated RAG  
- Permission-based access control  
- Usage tracking & cost control  
- Multi-tenant SaaS deployment  

The system is:

- Stateless  
- Multi-tenant safe  
- Cost-aware  
- Horizontally scalable  
- Production-ready  
- Architecturally simple  

## 1.1 Context Platform Repository Scope

- This repository implements the **Client (Web / App UI)** for the Context Platform, built as a React 19 + TypeScript SPA using Vite.  
- It integrates with **Firebase Authentication** on the client and uses a dual-storage data layer (Dexie.js + Firestore) via the `storage` adapter described in `.trae/rules/data-layer.md`.  
- It does not contain the Agent Server (FastAPI), PostgreSQL control-plane database, or Qdrant vector store by default; those are external services that this client communicates with via APIs.  
- Guest vs authenticated behavior in this repo maps to the **Guest Mode** and **Workspace** concepts described below, but all persistence in this codebase goes through the `storage` adapter rather than direct database access.  
- The `agent-platform/` directory at the repo root is reserved for the Agent Orchestration Server implementation described in this document. All backend logic for agents, orchestration, and control-plane integration will live there.  
- The React SPA in `src/` interacts with the Agent Server only over authenticated network APIs (e.g., HTTP/JSON). The frontend never bypasses the Agent Server to talk directly to PostgreSQL, Qdrant, or other control-plane infrastructure.  

---

# 2. High-Level Architecture

Client (Web / App UI)
↓
Firebase Authentication
↓
Agent Server (FastAPI - Modular Monolith)
↓
┌────────────────────────────────────┐
│ Core Modules                       │
│                                    │
│ - General Manager (GM)               │
│ - Domain Agents                      │
│ - RAG Service                        │
│ - Policy Engine                      │
│ - Usage Tracker                      │
│ - Conversation Manager               │
└────────────────────────────────────┘
↓
┌───────────────┬──────────────────┬──────────────┬──────────────┐
│ PostgreSQL    │ Qdrant           │ Firestore    │ LLM API      │
│ (Control DB)  │ (Vector DB)      │ (Workspace)  │ (External)   │
└───────────────┴──────────────────┴──────────────┴──────────────┘


---

# 3. Identity & User Provisioning Rules

This section defines how users are created and managed in PostgreSQL.

---

## 3.1 Source of Truth for Identity

- Identity provider: Firebase Authentication  
- Canonical user ID: `firebase_uid`  
- PostgreSQL does NOT generate its own user ID  
- PostgreSQL uses `firebase_uid` as primary external identifier  

---

## 3.2 User Creation Rule (Important)

A PostgreSQL user record is created **ONLY when:**

> A user creates their first workspace.

Flow:

1. User authenticates via Firebase.
2. User creates a new workspace.
3. System checks PostgreSQL:
   - If `firebase_uid` does NOT exist → create new user record.
   - If exists → do nothing.
4. Workspace record is created and linked to that user.

This guarantees:

- No unnecessary user records.
- PostgreSQL only stores users who actually use the system.
- Lazy provisioning model.

---

## 3.3 Guest Users Rule (Critical)

Guest users (local-only users using localDB):

- Must NOT be created in PostgreSQL.
- Must NOT have usage logs persisted in PostgreSQL.
- Must NOT have workspace records persisted in PostgreSQL.
- Must NOT create conversations in PostgreSQL.

Guest users operate:

- Fully local
- Ephemeral
- Outside control plane persistence

This rule ensures:

- Clean separation between local testing mode and SaaS mode
- No pollution of billing system
- No accidental persistence of anonymous users

---

# 4. Data Layer

---

## 4.1 PostgreSQL (Control Plane Database)

Database engine: **:contentReference[oaicite:2]{index=2}**

### Tables

- users  
- workspaces  
- agents  
- agent_permissions  
- conversations  
- messages  
- usage_logs  
- workspace_index_status  

---

### 4.1.1 `users` Table

**Created Only When:**  
User creates their first workspace.

**Required Fields:**

- id (internal UUID)  
- firebase_uid (unique, indexed)  
- created_at  
- updated_at  
- plan_type  
- billing_status  

**Rules:**

- `firebase_uid` must be unique.
- No record for guest users.
- No record created during authentication.
- Creation happens during workspace creation flow.

---

### 4.1.2 `workspaces` Table

Fields:

- id  
- owner_user_id (FK → users.id)  
- name  
- created_at  
- updated_at  
- indexing_status  
- plan_limit_snapshot (optional)  

Rules:

- Workspace cannot exist without a PostgreSQL user.
- Guest users cannot create persistent workspaces.

---

### 4.1.3 Responsibilities of PostgreSQL

Acts as the **Control Plane**, responsible for:

- Permission checks  
- Usage tracking  
- Billing support  
- Conversation persistence  
- Workspace ownership  
- Plan enforcement  
- RAG indexing state tracking  

It does NOT store:

- Workspace content data (stored in Firestore)  
- Embeddings (stored in Qdrant)  

---

## 4.2 Firestore (Workspace Data Plane)

Database service: **:contentReference[oaicite:3]{index=3}**

Role:

- Primary structured data storage  
- Application objects  
- Product/problem/UI entities  

Rules:

- Only accessible via App Service layer  
- Agents cannot directly access Firestore  
- All writes validated by Policy Engine  

---

## 4.3 Qdrant (Vector Store)

Vector database: **:contentReference[oaicite:4]{index=4}**

Structure:

- Separate namespace per workspace  
- Metadata filtering enabled  

Rules:

- No cross-workspace search  
- Only upsert changed documents  
- Re-embed only on version mismatch  

---

# 5. Agent Server

Framework: **:contentReference[oaicite:5]{index=5}**

Responsibilities:

- API routing  
- Firebase token validation  
- Request lifecycle management  
- Agent execution  
- Orchestration logic  
- RAG coordination  
- Permission enforcement  
- Usage logging  
- Conversation persistence  

Hard Constraints:

- No long-lived in-memory state  
- No direct Firestore access by agents  
- All critical actions logged  

---

# 6. Agent Interaction Model

---

## 6.1 Direct Agent Mode

User → Selected Agent → Optional RAG → Response


Characteristics:

- Single-agent execution  
- Lower latency  
- Lower token cost  
- No delegation  

Use cases:

- Focused tasks  
- Specialist consultation  
- Iterative design work  

---

## 6.2 GM-Orchestrated Mode

User → GM
↓
Task Decomposition
↓
Delegation to Agents
↓
Aggregation
↓
Final Response


Characteristics:

- Multi-agent collaboration  
- Higher cost  
- Structured delegation  

Rules:

- Agents cannot call each other.
- All inter-agent communication must pass through GM.
- Permission checks occur before each delegation.

---

# 7. Workspace Creation Flow

Validate Firebase token

Extract firebase_uid

Check if user exists in PostgreSQL

If NOT exists:

Create user record

Create workspace record

Initialize workspace_index_status

Return workspace


Important:

- This is the ONLY place user records are created.
- Authentication alone never creates a DB user.

---

# 8. Guest Mode Flow

No Firebase token

Local-only session

No PostgreSQL access

No persistent workspace

No usage logging in control plane


Hard constraint:

Guest mode must never touch control-plane infrastructure.

---

# 9. Security Guarantees

The system guarantees:

- PostgreSQL only contains real, persistent users.
- No guest data pollutes billing or usage systems.
- User creation is deterministic and lazy.
- Workspace ownership is strongly enforced.
- Firebase UID is canonical identity.
- Full multi-tenant isolation.

---

# 10. Architectural Guarantees

This architecture ensures:

- Clean identity boundary between Firebase and control plane.
- Lazy provisioning model for user records.
- Strict guest vs SaaS separation.
- Deterministic orchestration.
- Scalable and cost-aware infrastructure.
- Extensible agent system.

---

# 11. Summary

The Context Platform architecture enforces:

- Direct agent interaction  
- GM-based orchestration  
- Lazy user creation on first workspace  
- Firebase UID as canonical identity  
- No persistence for guest users  
- Strict separation of control plane vs data plane  
- Production-ready SaaS architecture  
