---
alwaysApply: false
applyMode: intelligence
description: Entry point for working on the React SPA under app/, mapping to architecture, data, and linting rules.
---
# Frontend App Overview (`app/`)

This document is the entry point for any work inside the frontend application under `app/`.

The frontend is a React 19 + TypeScript SPA built with Vite. It implements the workspace dashboard and all “Apps” (Pyramid Solver, Product Definition, Technical Architecture, etc.).

## Directory Layout

Key directories under `app/src/`:

- `app/src/pages/` – Route-level pages that compose screens and load data.
- `app/src/components/` – Reusable UI components.
- `app/src/components/ui/` – Generic Shadcn/Tailwind primitives.
- `app/src/hooks/` – Custom React hooks for state and side effects.
- `app/src/contexts/` – React Context providers (auth, workspace, settings).
- `app/src/services/` – Business logic, storage adapter, Firebase, and domain services.
- `app/src/types/` – Shared TypeScript domain models.

The Vite config lives in `app/vite.config.ts` and sets up aliases (e.g. `@` → `app/src`).

## Related Rules

When changing anything in `app/`, read these rules:

- `.trae/rules/architecture.md` – Overall SPA architecture and storage adapter pattern.
- `.trae/rules/base.md` – Core coding and data persistence rules.
- `.trae/rules/data-layer.md` – Details of the storage adapter and data model expectations.
- `.trae/rules/repo.md` – Frontend project structure, commands, and feature creation checklist.
- `.trae/rules/linting.md` – Linting and coding standards for the app.
- `.trae/rules/AI_CHECKLIST.md` – Definition of Done and QA expectations for changes.
- `.trae/rules/app-structure.md` and `.trae/rules/apps/*.md` – Rules for each workspace “App” implemented in the SPA.
- `.trae/rules/agent-platform-ui/agent-platform-ui-overview.md` – Bridge rules for any UI that calls the Agent Platform backend.

Use this file together with `general/project-structure.md` to decide which rules apply to a given change.
