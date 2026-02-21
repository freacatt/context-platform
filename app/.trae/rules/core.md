---
alwaysApply: true
applyMode: always
description: Core architecture, data persistence, state management, and coding standards for the frontend app.
---
# Frontend App Core Rules

## CRITICAL — Data Persistence

- NEVER use `localStorage` or `IndexedDB` directly for domain data.
- ALWAYS use the storage adapter (`app/src/services/storage.ts`) for all CRUD operations.
- ALWAYS ensure data models serialize to both JSON (IndexedDB) and Firestore formats.
- ALWAYS scope data by `userId` and optionally `workspaceId`.
- ALWAYS use `storage.createId()` (nanoid) for new entity IDs.
- Each data type MUST have its own file in `app/src/types/` — never dump types into `index.ts`.

## CRITICAL — Code Principles

- Correctness > Completeness > Speed.
- Read before write — inspect existing patterns (especially `storage.ts`) before implementing.
- Small, focused diffs — do not refactor unrelated code.
- UI components MUST call Services, not the Storage Adapter directly.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + Shadcn UI (Radix Primitives) |
| State | Zustand (global) + React Context (feature-scoped) |
| Routing | React Router DOM v7 |
| Local DB | Dexie.js (IndexedDB) |
| Cloud DB | Firebase Firestore |
| Auth | Firebase Auth |
| AI | Anthropic SDK / Vercel AI SDK |

## Directory Structure

```
app/src/
├── components/     # Reusable UI (Shadcn UI, shared)
├── components/ui/  # Generic primitives only
├── hooks/          # Custom React hooks (state/action logic)
├── contexts/       # React Context providers (auth, workspace)
├── lib/            # Utilities (utils.ts)
├── pages/          # Route-level screens (compose UI, keep thin)
├── services/       # Business logic, storage adapter, domain services
│   ├── storage.ts  # MAIN DATA ADAPTER (Local + Cloud)
│   ├── localDB.ts  # Dexie configuration
│   └── firebase.ts # Firebase configuration
├── types/          # TypeScript domain models (one file per type)
└── App.tsx         # Entry point
```

## MUST — Code Placement

- Reused 2+ times → `components/`
- External calls / side effects → `services/`
- Business logic / state transitions → `hooks/` or pure utilities
- Shared interfaces → `types/`

## MUST — State Management

- USE Zustand for global app state (user session, settings).
- USE React Context for feature-scoped state (e.g., Workspace context).
- USE React Query or custom hooks with `storage.subscribe` for data fetching.

## Storage Adapter API

| Method | Signature |
|--------|-----------|
| Create | `storage.create(collection, data)` |
| Read | `storage.get(collection, id)` |
| Update | `storage.update(collection, id, data)` |
| Delete | `storage.delete(collection, id)` |
| Query | `storage.query(collection, filters)` — simple key-value filtering |
| Subscribe | `storage.subscribe(collection, id, callback)` — real-time updates |

Read strategy: LocalDB first → if not found, try Firestore → auto-sync to LocalDB if found remotely.

## MUST — Adding a New Data Entity

1. Define type in `app/src/types/<entity>.ts`
2. Register table in `app/src/services/localDB.ts` (primary key `id`, index `userId`)
3. Add security rule in `app/firestore.rules`
4. Create service in `app/src/services/<entity>Service.ts` using `storage` adapter
5. Build UI in `app/src/pages/` and `app/src/components/`

## MUST — Linting

- ESLint v9+ with Flat Config (`eslint.config.js`). Run: `npm run lint`
- Zero linting errors. Unused variables removed or prefixed with `_`.
- No `console.log` in production code.
- React hooks MUST follow Rules of Hooks. Effects MUST declare all dependencies.
- Ignored dirs: `dist/`, `dev-dist/`, `mcp-gateway/dist/`

## MUST — Security

- API keys in `.env` only — never hardcode.
- User data secured via Firestore Rules.
- Anthropic key is user-provided, stored in Firestore — never hardcoded.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run deploy` | Deploy to Firebase Hosting |
| `npm run lint` | Linting |

## Key Patterns

- **Context Adapter** (`app/src/services/contextAdapter.ts`): Unified interface to fetch domain objects (Pyramids, Product Definitions, etc.) via common `ContextSource` interface. Used by AI services and cross-referencing UI.
- **Dual Storage**: Guest users → LocalDB only. Auth users → LocalDB + Firestore (configurable). Cloud → Local sync on read.
