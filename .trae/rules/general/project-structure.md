---
alwaysApply: true
applyMode: intelligence
description: High-level project directory and rules structure for the frontend app, Agent Platform backend, and MCP gateway.
---
# Project Structure & Rules Map

This document defines the high-level structure of the repository and how rules are organized for each major area. Use it as the entry point whenever you start a change.

## Top-Level Directories

- `app/`: React 19 + TypeScript SPA for the Context Platform workspace UI (Pyramids, Product Definition, Technical Architecture, etc.).
- `agent-platform/`: FastAPI-based Agent Orchestration Server (control plane, permissions, RAG, conversations, usage tracking).
- `mcp-gateway/`: MCP gateway service that exposes workspace context and resources as MCP tools.

Any new code must live under one of these major areas. Avoid adding new top-level directories unless they represent a similarly major concern.

## Rules by Area

### 1. Frontend App (`app/`)

When working on anything under `app/` (React components, hooks, services, storage, routing, etc.), you must consult these rules:

- `.trae/rules/AI_CHECKLIST.md` – Definition of Done, testing and QA rules for any change that affects the app.
- `.trae/rules/base.md` – Global coding and data persistence rules for the frontend.
- `.trae/rules/architecture.md` – SPA architecture, storage adapter pattern, context adapter, and testing strategy.
- `.trae/rules/data-layer.md` – Detailed storage adapter and data model rules.
- `.trae/rules/repo.md` – Frontend project structure and commands.
- `.trae/rules/linting.md` – Linting and coding standards.
- `.trae/rules/3d-objects.md` – Rules for 3D assets used in the UI.
- `.trae/rules/app-structure.md` and `.trae/rules/apps/*.md` – Workspace “App” definitions and per-app behavior.

### 2. Agent Platform Backend (`agent-platform/`)

When working on anything under `agent-platform/` (Python FastAPI server, PostgreSQL models, Qdrant integration, auth, policy, etc.), you must consult:

- `.trae/rules/agent-platform/agent-platform-overview.md` – Backend architecture and control-plane/data-plane boundaries.
- `.trae/rules/agent-platform/agent-platform-phases.md` – Implementation roadmap and sequencing rules.
- `.trae/rules/agent-platform-ui/agent-platform-ui-overview.md` – Bridge layer between the Agent Platform backend and the frontend app; defines how the SPA must call the Agent Server and handle responses.

All backend logic for agents, permissions, conversations, and RAG must live under `agent-platform/` and follow these rules.

### 3. Agent Platform UI Bridge

The `agent-platform-ui` rules describe how the frontend app and Agent Platform coordinate:

- Rules live under `.trae/rules/agent-platform-ui/`.
- Apply whenever code in `app/` talks to the Agent Server in `agent-platform/`.
- Ensure both sides respect the same contracts for authentication, endpoints, and conversation UX.

### 4. MCP Gateway (`mcp-gateway/`)

The MCP gateway exposes workspace resources as MCP tools for external clients.

- Core implementation lives under `mcp-gateway/src/`.
- It integrates with Firestore and the same workspace concepts defined in the frontend app.
- For now, follow the patterns in `mcp-gateway/README.md` (if present) and keep behavior aligned with the data and context rules defined for the frontend app.

Future rule files specific to MCP behavior should live under `.trae/rules/mcp/` or a similar dedicated directory.

## How to Use These Rules

- **Step 1: Identify the area** you are changing: `app/`, `agent-platform/`, or `mcp-gateway/`.
- **Step 2: Read this file first** to know which rule documents apply.
- **Step 3: Open the area-specific rules** listed above and follow them for implementation details.

The assistant should apply this file **always**, and apply the more specific rule files **by intelligence** based on which directory the change touches.
