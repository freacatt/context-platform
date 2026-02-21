# Pyramid Solver — Monorepo

Multi-project workspace with a React SPA, a FastAPI agent backend, and an MCP gateway.

## Architecture

```
Client (SPA) → Firebase Auth → Agent Server (FastAPI)
                                    ↓
                    ┌──────────┬──────────┬──────────┐
                    │  Qdrant  │Firestore │ LLM API  │
                    │(Vectors) │ (Shared) │(External)│
                    └──────────┴──────────┴──────────┘
```

## Sub-Projects

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `app/` | React 19 + TypeScript + Vite | SPA workspace UI |
| `agent-platform/` | FastAPI + Python | Agent orchestration server |
| `mcp-gateway/` | Node.js | MCP integration layer |

## Key Boundaries

- SPA communicates with Agent Server ONLY via authenticated HTTP/JSON APIs.
- Firebase Auth is the ONLY identity provider. `firebase_uid` is canonical user ID.
- Firestore = shared data store (both frontend and agent-platform). Qdrant = vector store.
- NO cross-workspace data access anywhere in the stack.

## Documentation Sync

When changing `agent-platform/`, keep in sync: `agent-platform/README.md` and `agent-platform/CLAUDE.md`.

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
