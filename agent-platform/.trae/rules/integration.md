---
alwaysApply: false
applyMode: intelligence
description: Rules for how the frontend SPA interacts with the Agent Platform backend.
globs:
  - "app/src/**/agent*"
  - "app/src/**/Agent*"
  - "app/src/pages/AiChat*"
  - "app/src/components/Chat/**"
---
# Agent Platform UI Integration

Bridge rules between the React SPA and the Agent Orchestration Server.

## CRITICAL

- SPA MUST communicate with Agent Server ONLY via authenticated HTTP/JSON APIs.
- Every request affecting agents or conversations MUST include a Firebase ID token.
- UI MUST NEVER talk directly to PostgreSQL, Qdrant, or control-plane infrastructure.
- Agent capabilities MUST be derived from the server — NEVER hard-coded in the client.

## MUST — Agent Selection

- UI exposes selection for Direct Agent Mode and GM-Orchestrated Mode.
- Selected agent and mode determine which server endpoint is called.
- GM agent is the default orchestrator per workspace.
- Agent pickers MUST only list agents belonging to the active workspace — no cross-workspace sharing.

## MUST — Permissions

- Fetch agent config and app permissions from server for each workspace.
- Show/hide UI actions based on server-granted scopes.
- NEVER allow actions the server has not granted via permissions.

## MUST — Conversation UX

- Render message history from Agent Server (source of truth).
- Support streaming/incremental updates when available.
- Show loading, in-progress, and failed states for agent calls.
