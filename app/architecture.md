# Frontend App — Architecture

## Overview

React 19 + TypeScript SPA that provides a workspace-based platform for problem-solving, product management, technical documentation, and AI-powered assistance. Communicates with Agent Platform backend exclusively via authenticated HTTP/JSON APIs.

```
Browser (SPA)
  ├── Firebase Auth (Google OAuth, Email/Password, Guest)
  ├── Dexie.js (IndexedDB — local-first storage)
  ├── Firebase Firestore (cloud sync)
  └── Agent Platform API (AI features)
         │
   ┌─────┼────────────┐
   ▼     ▼            ▼
Firestore  Qdrant   LLM APIs
(Shared)  (Vectors) (via Agent Platform)
```

---

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
| AI | Agent Platform Client (HTTP) |

---

## Directory Structure

```
app/src/
├── App.tsx                     # Entry point, provider stack, routing
├── components/                 # Reusable UI components
│   ├── ui/                     # Generic Shadcn primitives (button, card, dialog, accordion, etc.)
│   ├── ai-elements/            # Conversation, Message, PromptInput components
│   ├── AgentSettings/          # AgentConfigModal
│   ├── Board/                  # PyramidBoard, Block, BlockModal
│   ├── Chat/                   # (reserved for future chat components)
│   ├── Common/                 # AiRecommendationButton, ContextAttachmentsField
│   ├── Dashboard/              # CreatePyramidModal, PyramidCard, AppCard3D
│   ├── Diagram/                # DiagramBlockModal, DiagramNode
│   ├── GlobalContext/          # ContextSelectorModal, GlobalContextManager
│   ├── Layout/                 # AuthenticatedLayout, PublicLayout
│   ├── Navbar/                 # Navbar, ContextModal
│   ├── ProductDefinition/      # TopicEditModal, ProductDefinitionNode
│   ├── TechnicalTask/          # Task board, pipeline, detail components
│   ├── editor/                 # Rich text editor with plugins
│   └── PWA/                    # PWAPrompt
├── contexts/                   # React Context providers
│   ├── AuthContext.tsx          # User auth, guest mode, Firebase
│   ├── WorkspaceContext.tsx     # Workspace selection, agent setup
│   ├── GlobalContext.tsx        # AI context sources, aggregation
│   ├── AlertContext.tsx         # Global toast notifications
│   └── PWAContext.tsx           # PWA install prompt
├── hooks/                      # Custom React hooks
├── lib/                        # Utilities (utils.ts)
├── pages/                      # Route-level screens
├── services/                   # Business logic & data access
│   ├── storage.ts              # CORE: Dual storage adapter (Local + Cloud)
│   ├── localDB.ts              # Dexie.js IndexedDB configuration
│   ├── firebase.ts             # Firebase Auth & Firestore init
│   ├── agentPlatformClient.ts  # Agent Platform REST API client
│   ├── aiService.ts            # AI wrapper (session-based chat)
│   ├── contextAdapter.ts       # Unified context data fetching
│   ├── pyramidService.ts       # Pyramid CRUD
│   ├── productDefinitionService.ts
│   ├── contextDocumentService.ts
│   ├── directoryService.ts
│   ├── diagramService.ts
│   ├── technicalArchitectureService.ts
│   ├── technicalTaskService.ts
│   ├── uiUxArchitectureService.ts
│   ├── workspaceService.ts
│   ├── workspaceSettingsService.ts
│   ├── exportService.ts
│   └── productDefinitionTemplates.ts
└── types/                      # TypeScript domain models
    ├── pyramid.ts
    ├── workspace.ts
    ├── productDefinition.ts
    ├── contextDocument.ts
    ├── diagram.ts
    ├── technicalArchitecture.ts
    ├── technicalTask.ts
    ├── uiUxArchitecture.ts
    ├── agent.ts
    ├── session.ts
    ├── contextSource.ts
    ├── directory.ts
    └── index.ts
```

---

## Context Providers (Provider Stack)

```
ThemeProvider
  └── ErrorBoundary
      └── Router
          └── AuthProvider          # User auth state
              └── AlertProvider     # Toast notifications
                  └── WorkspaceProvider  # Workspace management
                      └── GlobalProvider # AI context aggregation
                          └── PWAProvider
                              └── Routes
```

### AuthContext
- Firebase Google OAuth, Email/Password, Guest mode
- Creates user document on first sign-in
- Clears local DB on login to prevent cross-user data leaks
- Reauthentication flow for sensitive operations
- Exports: `useAuth()`, methods: `loginAsGuest`, `signInWithGoogle`, `signInWithEmail`, `signUpWithEmail`, `logout`

### WorkspaceContext
- Loads all workspaces for current user
- Auto-setup of agent-platform infrastructure on workspace creation (Qdrant + GM agent)
- Persists current workspace to localStorage
- Agent ID assignments: gmAgentId, aiRecommendationAgentId, aiChatAgentId
- Exports: `useWorkspace()`, methods: `createNewWorkspace`, `removeWorkspace`, `refreshWorkspaces`, `setCurrentWorkspace`

### GlobalContext
- Manages workspace-level context sources for AI inclusion
- Fetches and aggregates selected context data into formatted text
- Auto-saves selections to Firebase per workspace
- Uses `contextAdapter` for unified data fetching across all entity types
- Exports: `useGlobalContext()`, state: `selectedSources`, `aggregatedContext`, `isContextLoading`

### AlertContext
- Global alert/toast system with auto-dismiss
- Types: success, warning, error, info
- Exports: `useAlert()`, methods: `showAlert`, `hideAlert`

---

## Data Storage Architecture

### Dual Storage (storage.ts)
- **Guest users**: LocalDB (Dexie/IndexedDB) only
- **Auth users**: LocalDB + Firebase Firestore
- **Read strategy**: LocalDB first -> if not found, try Firestore -> auto-sync to LocalDB
- **Write strategy**: Both LocalDB and Firestore (if authenticated)

### Storage API
```typescript
storage.createId()                           // nanoid generation
storage.save(collection, data)               // Create/Update
storage.get(collection, id)                  // Read (local-first)
storage.update(collection, id, data)         // Partial update
storage.delete(collection, id)               // Delete
storage.query(collection, filters)           // Query with filters
storage.subscribe(collection, id, callback)  // Real-time subscription
```

### LocalDB Tables (Dexie)
pyramids, productDefinitions, contextDocuments, directories, uiUxArchitectures, diagrams, technicalTasks, pipelines, technicalArchitectures, globalTasks, workspaces, workspace_mcp_settings

**Note:** `conversations` and `messages` tables were removed in v5 — sessions (server-side) replace them.

---

## Routing

### Public Routes
| Path | Page | Description |
|------|------|-------------|
| `/` | LandingPage | Marketing/intro |
| `/docs` | DocsPage | Documentation |
| `/about` | AboutPage | About info |
| `/features` | FeaturesPage | Feature showcase |
| `/login` | LoginPage | Auth (Google, Email, Guest) |

### Authenticated Routes (ProtectedRoute)

#### Workspaces
| Path | Page | Description |
|------|------|-------------|
| `/workspaces` | WorkspacesPage | Workspace list and creation |
| `/workspace/:id/dashboard` | Dashboard | Main app selector (8 categories) |

#### Problem Solving, Thinking and Planning (bg-indigo-600)
| Path | Page | Description |
|------|------|-------------|
| `/pyramids` | PyramidsPage | Pyramid list |
| `/pyramid/:id` | PyramidEditor | 8x8 grid editor |
| `/diagrams` | DiagramsPage | Diagram list |
| `/diagram/:id` | DiagramEditor | ReactFlow visual editor |

#### Product Design & Management (bg-teal-600 / bg-pink-600)
| Path | Page | Description |
|------|------|-------------|
| `/product-definitions` | ProductDefinitionsPage | Product def list |
| `/product-definition/:id` | ProductDefinitionEditor | Hierarchical mindmap editor |
| `/ui-ux-architectures` | UiUxArchitecturesPage | UI/UX list |
| `/ui-ux-architecture/:id` | UiUxArchitectureEditorPage | Theme/component/page editor |

#### Knowledge Base (bg-amber-600)
| Path | Page | Description |
|------|------|-------------|
| `/context-documents` | ContextDocumentsPage | Document list |
| `/context-document/:id` | ContextDocumentEditor | Rich text editor |
| `/directory/:id` | DirectoryDocumentsPage | Directory contents |

#### Technical (bg-purple-600 / bg-blue-600)
| Path | Page | Description |
|------|------|-------------|
| `/technical-architectures` | TechnicalArchitecturesPage | Architecture list |
| `/technical-architecture/:id` | TechnicalArchitectureEditorPage | Architecture editor |
| `/technical-tasks` | TechnicalTaskBoard | Kanban board |
| `/technical-task/:id` | TechnicalTaskDetail | Task detail view |

#### AI Apps (bg-violet-600)
| Path | Page | Description |
|------|------|-------------|
| `/ai-chat` | AiChatPage | Session-based AI chat |
| `/workspace/:id/ai-settings` | AiSettingsPage | Agent configuration |

---

## Workspace Apps

### Pyramid Solver
- **8x8 grid** of blocks (64 blocks, always)
- Block types: regular, combined
- Context attachments, export to Excel/Markdown
- Real-time subscription via storage adapter

### Product Definition
- **Hierarchical mindmap** with root node always "root"
- Templates: classic-product-definition, shape-up-methodology, blank
- React Flow visualization, topic modal with AI suggestions
- Context attachments per node

### Context Documents
- Text/document types with rich editor
- Directory organization (deleting directory moves docs to root)
- Used as context sources across all other apps

### Diagrams
- ReactFlow-based visual editor
- Nodes with title, description, context attachments
- Edge connections between nodes

### Technical Architecture
- 10+ sections: system architecture, technology stack, code organization, design patterns, API standards, security, performance, testing, deployment, preservation rules, AI instructions
- Each section: main + advanced subsections
- Initialized with full deep structure on creation

### UI/UX Architecture
- Theme specification (colors, typography, spacing, border radius)
- Base component catalog
- Page definitions with routing
- UX patterns (loading, error, empty states)

### Technical Tasks (Kanban)
- Pipeline-based kanban board ("Backlog" auto-created)
- Task types: NEW_TASK, FIX_TASK
- Priority: LOW, MEDIUM, HIGH, CRITICAL
- Status: PENDING, IN_PROGRESS, COMPLETED, BLOCKED
- Dual-write to technicalTasks + globalTasks collections

---

## AI Features

### AI Chat (AiChatPage)
- **Server-side sessions** via Agent Platform API
- Session management: create, list, load messages, send messages, close
- Agent selection: workspace.aiChatAgentId or workspace.gmAgentId fallback
- Global context injected on every message
- Tool call traces displayed in expandable UI blocks
- Optimistic message rendering
- **Chat-only mode**: Toggle before starting a session to disable tool execution (pure conversation)

**Flow:**
```
User types message
  ├── If no active session: createSession(workspaceId, agentId, chatOnly?)
  ├── Optimistically add user message to UI
  ├── sendSessionMessage(sessionId, message, globalContext)
  ├── Replace optimistic msg with server response
  ├── Display assistant response + tool call traces (if not chat_only)
  └── Refresh session list
```

### AI Settings (AiSettingsPage)
- Load agents for workspace from agent-platform API
- Agent assignment: which agent handles recommendations vs chat
- Agent CRUD: create, edit (modal), delete with confirmation
- Agent cards show: type badge, model info, orchestrator badge, MCP count, app access tags

### Agent Configuration (AgentConfigModal)
- Name, model selection (auto/manual with provider+model)
- Agent instructions (system prompt)
- Orchestrator toggle (can delegate tasks)
- **App Access**: Accordion-based per-app permission selection (create, read, update, delete, list) with select/deselect all
- **MCP Servers**: Dynamic list with name, URL, auth type (none/bearer/api_key)

### Field AI Recommendations
- `AiRecommendationButton` component used across apps
- Calls `/recommend` endpoint with prompt_type and variables
- Agent selection: workspace.aiRecommendationAgentId or gmAgentId
- Used in: product definition topics, technical task descriptions, diagram nodes

### Global Context System
- Users select context sources from GlobalContext modal
- Sources: any entity type (pyramid, product def, diagram, doc, architecture, task)
- Persisted per workspace in Firebase
- `contextAdapter` fetches actual data and formats as markdown
- Injected into every AI message

---

## Agent Platform Client (agentPlatformClient.ts)

All requests include Firebase ID token via `Authorization: Bearer <token>`.

### Endpoints Used
| Function | Method | Path |
|----------|--------|------|
| setupWorkspace | POST | /workspaces/setup |
| getWorkspace | GET | /workspaces/{id} |
| getAgents | GET | /agents |
| createAgent | POST | /agents |
| updateAgent | PUT | /agents/{id} |
| deleteAgent | DELETE | /agents/{id} |
| recommend | POST | /recommend |
| createSession | POST | /sessions (supports chatOnly flag) |
| listSessions | GET | /sessions |
| getSession | GET | /sessions/{id} |
| sendSessionMessage | POST | /sessions/{id}/messages |
| deleteSession | DELETE | /sessions/{id} |
| updateSessionStatus | PATCH | /sessions/{id} |
| getApps | GET | /apps |
| getModels | GET | /models |

### Data Conversion
- API uses snake_case, frontend uses camelCase
- Mappers: `mapAgent()`, `mapSession()`, `mapSessionListItem()`, `mapSessionMessageResponse()`

---

## Key Data Types

### Agent (agent.ts)
```typescript
AgentConfig {
  id, workspaceId, userId, name, type ('gm'|'custom')
  modelMode ('auto'|'manual'), modelProvider?, modelName?
  skills[], context (system prompt), isDefault, isOrchestrator
  appAccess: AppAccessEntry[]    // [{appId, permissions[]}]
  mcpServers: McpServerEntry[]   // [{name, url, auth}]
  orchestratorConfig: OrchestratorConfig | null
}
```

### Session (session.ts)
```typescript
Session { id, workspaceId, agentId, userId, title, status, messages[], metadata, parentSessionId }
SessionMessage { id, role, content, timestamp, metadata }
SessionListItem { id, title, status, messageCount, lastMessagePreview }
SessionMessageResponse { userMessage, assistantMessage, model, toolCalls[] }
ToolCallTrace { toolId, args, result }
```

### Workspace (workspace.ts)
```typescript
Workspace {
  id, userId, name, createdAt, lastModified
  gmAgentId?, aiRecommendationAgentId?, aiChatAgentId?
}
```

### Context Source (contextSource.ts)
```typescript
ContextSource {
  id, type ('contextDocument'|'productDefinition'|'pyramid'|'technicalArchitecture'|
            'technicalTask'|'uiUxArchitecture'|'directory'|'diagram'), title?
}
```

---

## Data Flow Patterns

### Create Entity
```
User Action (Modal) -> Service.create(userId, workspaceId, ...) -> storage.save(collection, data) -> LocalDB + Firestore -> Refresh list
```

### Edit Entity
```
User Change (UI) -> Service.update(id, data) -> storage.update(collection, id, data) -> LocalDB + Firestore -> subscription callback -> re-render
```

### Workspace Switch
```
User selects workspace -> setCurrentWorkspace() -> ensureWorkspaceSetup() (if no gmAgentId) -> setupWorkspaceAgentPlatform() -> agents ready
```

### Context Aggregation
```
User selects sources -> save to workspace.globalContextSources -> for each: contextAdapter.fetchContextData() -> formatContextDataForAI() -> aggregatedContext injected into AI
```

---

## Firestore Security Rules

### Frontend-managed collections (full CRUD)
pyramids, productDefinitions, contextDocuments, directories, diagrams, technicalArchitectures, technicalTasks, uiUxArchitectures, pipelines, globalTasks, workspaces, users, workspace_mcp_settings

**Rule pattern**: `allow create: if isOwner(request.resource.data.userId); allow read, update, delete: if isOwner(resource.data.userId);`

### Agent-platform-managed collections (read-only from frontend)
agents, sessions — writes via Admin SDK (bypasses rules)

**Rule pattern**: `allow read: if request.auth != null && resource.data.userId == request.auth.uid;`

---

## Key Architecture Decisions

1. **Local-first storage**: Dexie (IndexedDB) for instant reads, Firestore for cloud sync. Guest users work entirely offline.
2. **Service layer**: All data access goes through services, never direct storage calls from components.
3. **Agent Platform API**: All AI features go through authenticated HTTP calls to FastAPI backend. No direct LLM calls from frontend.
4. **Server-side sessions**: Chat conversations managed by agent-platform, not local storage. Frontend is display-only.
5. **Global context**: Workspace-level context aggregation injected into every AI interaction.
6. **Workspace isolation**: All entities scoped by userId + workspaceId. Workspace deletion cascades.
7. **Shadcn UI**: All primitives from Radix via Shadcn. Custom components compose these primitives.
