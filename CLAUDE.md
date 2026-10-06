# Context Platform — Monorepo

## Architecture

```
React SPA (app/src) ──useQuery / useMutation──▶ Convex (app/convex): auth, functions, database
```

## Sub-Projects

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `app/` | React 19 + TypeScript + Vite + Convex | The product: SPA, backend and shared domain logic |
| `public_website/` | React + TypeScript + Vite | Public marketing site |

## Key Boundaries

- Convex is the only backend (database, functions, auth). There is no other server or data store.
- The SPA reaches data only through Convex functions; each function enforces auth and workspace ownership via `app/convex/lib/access.ts`.
- NO cross-workspace data access anywhere in the stack.
- Pure domain logic lives in `app/shared/` and is used by both backend and frontend.

## Documentation Sync

When changing `app/`, keep in sync: `app/CLAUDE.md`, `app/architecture.md` and `app/.trae/rules/core.md` (mirror of `app/CLAUDE.md`).

## Slash Commands

### Agent Roles
- `/project:coder` — Implement with architecture boundaries
- `/project:orchestrator` — Full change workflow (plan → implement → test → review)
- `/project:reviewer` — Code review with structured verdict
- `/project:tester` — Write and run tests

### OpenSpec Workflow
- `/project:openspec-new` — Start a new change
- `/project:openspec-ff` — Fast-forward all artifacts at once
- `/project:openspec-continue` — Continue next artifact
- `/project:openspec-apply` — Implement tasks from artifacts
- `/project:openspec-verify` — Verify implementation matches specs
- `/project:openspec-archive` — Archive completed change
- `/project:openspec-bulk-archive` — Batch archive multiple changes
- `/project:openspec-sync` — Sync delta specs to main specs
- `/project:openspec-explore` — Think-partner exploration mode
- `/project:openspec-onboard` — Guided first-time tutorial
