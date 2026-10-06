---
alwaysApply: true
applyMode: always
description: Project routing table scoped to the app sub-project.
---
# Project Map (App)

## Stack

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `app/src/` | React 19 + TypeScript + Vite | SPA workspace UI (Pyramids, Product Definition, Technical Architecture, etc.) |
| `app/convex/` | Convex | Database, server functions, auth |
| `app/shared/` | TypeScript | Pure domain logic shared by both |

MUST place all new frontend code under `app/`.

## Rule Routing

| Working in... | Read these rules |
|---------------|-----------------|
| `app/` | `core.md`, `testing-and-qa.md`, `app-requirements.md` |
| `app/` (specific app) | Also read the matching file in `apps/*.md` |
