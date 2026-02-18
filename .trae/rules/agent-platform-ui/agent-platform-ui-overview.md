alwaysApply: false
applyMode: intelligence
description: Defines how the frontend app UI interacts with the Agent Orchestration Server, including authentication, agent selection, permissions, and conversation UX.
---
# Agent Platform UI Overview

This document defines how the React SPA interacts with the Agent Server and its agents.

## 1. Scope

- All files in `.trae/rules/agent-platform/` describe the **server-side Agent Orchestration Server**.  
- All files in `.trae/rules/agent-platform-ui/` describe the **UI-side behavior** for interacting with that server from the front-end app.  
- This ruleset forms the **bridge layer** between the Agent Platform backend and the React SPA, defining the integration contract (endpoints, auth, and UX expectations).
- Concrete UI components and hooks live in `app/src/` and must follow the rules in this document.

## 2. Core Interaction Model

- The SPA always talks to the Agent Server over authenticated HTTP/JSON APIs.  
- Every request that affects agents or conversations must include a Firebase ID token.  
- The UI must never talk directly to PostgreSQL, Qdrant, or other control-plane infrastructure.

## 3. Agent Selection and Modes

- The UI exposes a way to select:
  - A direct agent to talk to in **Direct Agent Mode**.  
  - A GM-orchestrated entry point in **GM-Orchestrated Mode**.  
- The selected agent and mode determine which server endpoint the UI calls and how responses are rendered.
- For each workspace, the UI must treat the **GM agent** as the default orchestrator and may offer additional workspace-local agents that the user has created.  
- Agent pickers and menus must only list agents that belong to the currently active workspace; agents are never shared across workspaces.

## 4. Permissions and Apps

- The UI must treat agent capabilities as **derived from the server**, not hard-coded in the client.  
- For each workspace and agent, the UI may:
  - Fetch the agent’s configuration and app permissions.  
  - Show or hide actions in the UI based on the scopes returned by the server (for example, app-level capabilities defined in `agent-platform-overview.md`).  
- The client must not allow an agent to initiate actions that the server has not granted via permissions.

## 5. Conversation UX

- The UI is responsible for:
  - Rendering message history returned by the Agent Server.  
  - Streaming or incremental updates when supported by the API.  
  - Showing status (loading, in-progress, failed) for agent calls.  
- The server remains the source of truth for conversation state and agent execution.
