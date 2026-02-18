---
alwaysApply: true
applyMode: intelligence
description: Core coding, data, and testing principles for all agents working in this repo.
---
# Base Instructions (Applies to all Agents)
## Core Principles
- **Correctness > Completeness > Speed**: Verify changes before moving on.
- **Small, Focused Diffs**: Do not refactor unrelated code.
- **Read Before Write**: Always inspect existing patterns (especially `app/src/services/storage.ts`) before implementing new data logic.
- **Explicitness**: Prefer clear, readable code over clever one-liners.

## Development Best Practices

### 1. Data Persistence (CRITICAL)
- **NEVER** use `localStorage` or `IndexedDB` directly for domain data.
- **ALWAYS** use the `storage` adapter (`app/src/services/storage.ts`) for all CRUD operations.
- **Dual-Write Compatibility**: Ensure all data models can be serialized to JSON (for IndexedDB) and Firestore formats.
- **Scoping**: All data must be scoped by `userId` and optionally `workspaceId`.

### 2. State Management
- Use **Zustand** for global app state (user session, settings).
- Use **React Context** for feature-specific scoped state (e.g., Workspace context).
- Use **React Query** (or custom hooks with `storage.subscribe`) for data fetching and caching.

### 3. Testing
- **Mandatory Verification**: Every behavior change must be verified.
- **Unit Tests**: Focus on Services and Utils. Mock the `storage` adapter to test business logic.
- **UI Tests**: Verify critical user flows (Auth, CRUD operations).

### 4. Code Organization (Frontend app)
- **`app/src/services/`**: All business logic and data access.
- **`app/src/components/`**: Pure UI components.
- **`app/src/pages/`**: Route-level orchestration.
- **`app/src/types/`**: Shared TypeScript interfaces.

## Definition of Done
- App builds and runs without errors.
- New features are integrated with the Storage Adapter.
- TypeScript types are strict (no `any` unless absolutely necessary).
- Tests pass (or manual verification is logged).
