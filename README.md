```text
   ______            __           __     
  / ____/___  ____  / /____  _  __/ /_    
 / /   / __ \/ __ \/ __/ _ \| |/_/ __/    
/ /___/ /_/ / / / / /_/  __/>  </ /_      
\____/\____/_/ /_/\__/\___/_/|_|\__/      
    ____  __      __  ____                
   / __ \/ /___ _/ /_/ __/___  _________ ___ 
  / /_/ / / __ `/ __/ /_/ __ \/ ___/ __ `__ \
 / ____/ / /_/ / /_/ __/ /_/ / /  / / / / / /
/_/   /_/\__,_/\__/_/  \____/_/  /_/ /_/ /_/ 
                                             
``` 
 
> **A workbench for structured thinking and architecture planning**

---

## Introduction

**Context Platform** is a workspace for structured thinking. It combines the **Pyramid Principle** (a core question broken into MECE sub-questions) with structured documents for product definitions, technical architecture, UI/UX architecture, tasks and diagrams.

## Architecture

```
React SPA (app/src) ──useQuery / useMutation──▶ Convex (app/convex)
                                                 ├── Auth (email/password)
                                                 ├── Functions (access-checked)
                                                 └── Database
```

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `app/` | React 19, TypeScript, Vite, Tailwind/shadcn, Convex | The product: SPA (`src/`), backend (`convex/`), shared domain logic (`shared/`) |
| `public_website/` | React, TypeScript, Vite | Public marketing site |

Convex is the only backend: database, server functions and auth. Every function checks that the signed-in user owns the workspace it touches.

## Workspace apps

Pyramid Solver, Diagrams, Decisions, Product Definitions, Research & Insights, Goals & Roadmaps, Design Systems, UI/UX Architectures, Context Documents, Glossaries, Technical Architectures and Technical Plans.

Every item can link to any other; the knowledge graph shows them all. **Export knowledge** downloads any selection (plus what it links to) as one Markdown file or a zip of Markdown files with an index and a relations graph, and the same selections (context packs), items and uploaded Markdown feed the Pyramid Solver as context. **Export workspace** is a full JSON backup that imports into a new workspace.

## Getting started

Requires Node 20+. No accounts or API keys are needed for local development.

```bash
cd app
npm install
npx convex dev --once     # first run: creates a local Convex backend and .env.local
npm run setup:auth        # first run: generates the auth signing keys
npm run dev               # Convex + Vite at http://localhost:5173
```

The first `npx convex dev` asks whether to use a Convex account or run locally; choose local (or set `CONVEX_AGENT_MODE=anonymous` to skip the prompt).

## Quality checks

```bash
cd app
npm run check   # typecheck + lint + backend and frontend tests
npm run build   # production build
```

See `app/architecture.md` for the design, `app/CLAUDE.md` for coding rules and `app/DEPLOYMENT.md` for deployment.
