---
alwaysApply: true
applyMode: always
description: Project routing table scoped to the agent-platform sub-project.
---
# Project Map (Agent Platform)

## Stack

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `agent-platform/` | FastAPI + Python | Agent Orchestration Server (control plane, permissions, RAG, conversations) |

MUST place all new backend code under `agent-platform/`.

## Rule Routing

| Working in... | Read these rules |
|---------------|-----------------|
| `agent-platform/` | `backend-architecture.md`, `implementation-phases.md`, `langchain.md` |
| `agent-platform/` calling SPA | Also read `integration.md` |
