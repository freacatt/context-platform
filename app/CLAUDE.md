# Frontend App — Rules

## CRITICAL — Data Persistence

- NEVER use `localStorage` or `IndexedDB` directly for domain data.
- ALWAYS use the storage adapter (`app/src/services/storage.ts`) for all CRUD.
- Data models MUST serialize to both JSON (IndexedDB) and Firestore formats.
- Scope data by `userId` and optionally `workspaceId`.
- Use `storage.createId()` (nanoid) for new entity IDs.
- Each data type has its own file in `app/src/types/` — never dump types into `index.ts`.

## CRITICAL — Code Principles

- Correctness > Completeness > Speed.
- Read before write — inspect existing patterns (especially `storage.ts`) before implementing.
- Small, focused diffs — do not refactor unrelated code.
- UI components MUST call Services, not the Storage Adapter directly.

## Tech Stack

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

## Code Placement

- Reused 2+ times → `components/`
- External calls / side effects → `services/`
- Business logic / state transitions → `hooks/` or pure utilities
- Shared interfaces → `types/`

## State Management

- Zustand for global app state (user session, settings).
- React Context for feature-scoped state (e.g., Workspace context).
- React Query or custom hooks with `storage.subscribe` for data fetching.

## Storage Adapter API

| Method | Signature |
|--------|-----------|
| Create | `storage.create(collection, data)` |
| Read | `storage.get(collection, id)` |
| Update | `storage.update(collection, id, data)` |
| Delete | `storage.delete(collection, id)` |
| Query | `storage.query(collection, filters)` |
| Subscribe | `storage.subscribe(collection, id, callback)` |

Read strategy: LocalDB first → if not found, try Firestore → auto-sync to LocalDB.

## Adding a New Data Entity

1. Define type in `app/src/types/<entity>.ts`
2. Register table in `app/src/services/localDB.ts` (primary key `id`, index `userId`)
3. Add security rule in `app/firestore.rules`
4. Create service in `app/src/services/<entity>Service.ts` using `storage` adapter
5. Build UI in `app/src/pages/` and `app/src/components/`

## Key Patterns

- **Context Adapter** (`app/src/services/contextAdapter.ts`): Unified interface to fetch domain objects via `ContextSource`. Used by AI services and cross-referencing UI.
- **Dual Storage**: Guest users → LocalDB only. Auth users → LocalDB + Firestore. Cloud → Local sync on read.

## Linting

- ESLint v9+ with Flat Config (`eslint.config.js`). Run: `npm run lint`
- Zero linting errors. Unused variables removed or prefixed with `_`.
- No `console.log` in production code.
- React hooks follow Rules of Hooks. Effects declare all dependencies.

## Security

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

---

## App Requirements (All Workspace Apps)

Every workspace App MUST have:

| Feature | Requirement |
|---------|-------------|
| Dashboard | Dedicated card on Workspace Dashboard, grouped by category |
| Creation | Modal-based with title input |
| Deletion | Requires typing object name to confirm |
| Renaming | Supported |
| Search | Local filter/search on App page |
| Global Context | Registered as distinct category, selectable for AI context |

---

## Testing & QA

### Definition of Done

A change is done ONLY when ALL are true:
- Feature works end-to-end (happy path + 2 edge cases)
- No console errors
- Typecheck/build passes (`npm run build`)
- Tests added/updated for new behavior
- If touching Firebase or AI: error states handled and safe

### Testing Rules

- ADD unit tests for new logic (data transforms, prompt builders, store adapters)
- ADD component test if UI behavior changes
- ADD e2e test only for critical user flow changes
- NEVER hit real Anthropic API in tests — mock/fake client
- NEVER use real Firebase in unit tests — mock adapter or emulator

### Test Organization

- All tests in `app/src/test/`, mirroring source structure
- Tooling: Vitest for unit/component tests
- Naming: `*.test.ts(x)` next to source OR in `__tests__/`

### Manual QA (Before PR)

- [ ] App loads, navigation works, no console errors
- [ ] Core flow affected by change works after refresh
- If Pyramids: create/edit/delete node, verify persistence
- If AI: missing API key → clear message; successful request works
- If Context Docs: add + remove doc, verify updates
- If Realtime Sync: 2 tabs, change in A appears in B

### PR Notes

Include: what changed, how to test, screenshots for UI, risk notes for Firebase/auth/AI.

---

## Agent Platform UI Integration

When working on agent/chat features:

- SPA MUST communicate with Agent Server ONLY via authenticated HTTP/JSON APIs.
- Every request MUST include Firebase ID token.
- UI MUST NEVER talk directly to Qdrant or agent data in Firestore.
- Agent capabilities derived from server — NEVER hard-coded.
- AI chat uses server-side sessions via `agentPlatformClient` session APIs.
- AI field recommendations use `agentPlatformClient.recommend()` via `AiRecommendationButton`.
- Agent configuration managed via AI Settings page (`/workspace/:workspaceId/ai-settings`).
- Session message history managed server-side. Frontend is display-only.

---

## App-Specific Rules

### Pyramid Solver
- **Category**: Problem Solving, Thinking and Planning | **Color**: `bg-indigo-600`
- CRITICAL: Every pyramid MUST have exactly 64 blocks (8x8 grid) on creation.
- Type: `Pyramid` in `app/src/types/pyramid.ts`
- Service: `app/src/services/pyramidService.ts`
- `createPyramid`: Initializes 8x8 grid of 64 blocks, type 'question'.
- `duplicatePyramid`: Deep copies, appends "(Copy)" to title, resets ID/timestamps.
- `getUserPyramids`: Sorted by `lastModified` descending.
- `subscribeToPyramid`: Real-time via storage adapter.

### Product Definition
- **Category**: Problem Solving, Thinking and Planning | **Color**: `bg-indigo-600`
- CRITICAL: Definitions start from template. Root node ID is always `"root"`.
- Types: `ProductDefinition`, `ProductDefinitionNode` in `app/src/types/productDefinition.ts`
- Service: `app/src/services/productDefinitionService.ts`
- Templates: `app/src/services/productDefinitionTemplates.ts`
- Available templates: `classic-product-definition`, `shape-up-methodology`, `blank-product-definition`. Unknown → blank.
- `updateProductDefinitionNode`: Updates via dot-path, refreshes `lastModified`.
- `mapDefinitionFromStorage`: Maps snake_case → camelCase.
- UI: Template grid in create modal (bounded `ScrollArea`). React Flow cards with title + description. Topic modal with AI suggestions via `AiRecommendationButton`. Attachments via `ContextSelectorModal`.

### Context Documents
- **Category**: Knowledge Base | **Color**: `bg-amber-600`
- CRITICAL: Documents always associated with `userId`. Type defaults to `"text"`. Deleting directory moves docs to root.
- Type: `ContextDocument` in `app/src/types/contextDocument.ts`
- Service: `app/src/services/contextDocumentService.ts`
- Directory Service: `app/src/services/directoryService.ts`

### Diagrams
- **Category**: Problem Solving, Thinking and Planning | **Color**: `bg-rose-600`
- CRITICAL: `nodes` and `edges` MUST default to empty arrays if undefined.
- Types: `Diagram`, `DiagramNodeData` in `app/src/types/diagram.ts`
- Service: `app/src/services/diagramService.ts`

### Technical Architecture
- **Category**: Technical | **Color**: `bg-purple-600`
- CRITICAL: New architectures MUST be initialized with full deep structure (all sections with empty placeholders).
- Type: `TechnicalArchitecture` in `app/src/types/technicalArchitecture.ts`
- Sections: `system_architecture`, `technology_stack`, `code_organization`, `design_patterns`, `api_standards`, `security_standards` (each with `main` + `advanced`).
- Service: `app/src/services/technicalArchitectureService.ts`

### Technical Tasks (Kanban)
- **Category**: Technical | **Color**: `bg-blue-600`
- CRITICAL: "Backlog" pipeline auto-created if none exist. Tasks always have `pipelineId`. `batchUpdateTasks` dual-writes to `technicalTasks` + `globalTasks`.
- Types: `TechnicalTask`, `TechnicalTaskData` in `app/src/types/technicalTask.ts`
- Service: `app/src/services/technicalTaskService.ts`

### UI/UX Architecture
- **Category**: Product Design & Management | **Color**: `bg-pink-600`
- CRITICAL: Timestamps (`createdAt`, `updatedAt`) MUST always be ISO strings.
- Type: `UiUxArchitecture` in `app/src/types/uiUxArchitecture.ts`
- Contains: `theme_specification`, `base_components`, `pages`, `ux_patterns`.
- Service: `app/src/services/uiUxArchitectureService.ts`
- `mapArchitectureFromStorage`: Converts Firestore Timestamp/string → ISO strings.

### AI Assistant
- **Category**: AI Apps | **Color**: `bg-violet-600`
- CRITICAL: Uses server-side sessions exclusively. No local conversation storage.
- Session types in `app/src/types/session.ts`
- Page: `app/src/pages/AiChatPage.tsx`
- API client: `app/src/services/agentPlatformClient.ts` (session CRUD + messaging)
- Flow: Create session → send message → server returns response + tool call traces → display
- Chat-only mode: Toggle before starting session to disable tool execution (pure conversation)
- Agent selection: Uses `workspace.aiChatAgentId` (chat) or `workspace.aiRecommendationAgentId` (field AI) with `gmAgentId` as fallback.
