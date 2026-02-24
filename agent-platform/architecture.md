# Agent Platform — Architecture

## Overview

FastAPI backend that provides AI agent orchestration, tool execution, session management, and multi-agent delegation for the Pyramid Solver workspace platform.

```
Client (SPA)
  │ Firebase ID Token (Bearer)
  ▼
FastAPI (agent-platform)
  ├── Auth (Firebase Admin SDK)
  ├── Agent CRUD (Firestore)
  ├── Session Management (Firestore)
  ├── Tool Registry (7 internal + MCP external)
  ├── Execution Engine (LLM + tool loop)
  ├── Planning Service (multi-step plans)
  ├── Orchestration (agent-to-agent delegation)
  ├── Permission Service (app access filtering)
  └── MCP Client (external tool servers)
        │
  ┌─────┼─────────────────────┐
  ▼     ▼                     ▼
Firestore  Qdrant (Vectors)  LLM APIs
(Shared)   (Per-workspace)   (OpenAI, Anthropic, Gemini, Grok, DeepSeek)
```

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | AI configuration: model, system prompt, app access, MCP servers |
| **Session** | Persistent conversation with message history, optional plan, and optional chat_only mode |
| **Tool** | Callable function (CRUD on Firestore collections or external MCP) |
| **App** | Platform domain (pyramids, diagrams, etc.) that registers 5 CRUD tools |
| **Orchestration** | GM agent delegates tasks to specialist agents via sub-sessions |
| **Plan** | Multi-step structured execution stored in session metadata |
| **MCP** | Model Context Protocol for connecting external tool servers |

---

## Directory Structure

```
agent-platform/
├── main.py                    # FastAPI app, middleware, exception handlers, routers
├── config.py                  # Settings (env vars, CORS, Firebase, Qdrant)
├── api/                       # Route handlers
│   ├── agents.py              # Agent CRUD endpoints
│   ├── sessions.py            # Session & message endpoints (supports chat_only mode)
│   ├── plans.py               # Plan approval & execution
│   ├── workspaces.py          # Workspace setup (Qdrant + default agent)
│   ├── apps.py                # App registry listing
│   ├── models.py              # LLM provider/model listing
│   └── recommend.py           # AI recommendations with prompt templates
├── services/                  # Business logic
│   ├── auth.py                # Firebase token verification
│   ├── agents.py              # Agent Firestore CRUD
│   ├── session_service.py     # Session & message management
│   ├── chat_service.py        # Stateless LLM chat (no tools)
│   ├── execution_service.py   # LLM + tool execution loop
│   ├── planning_service.py    # Plan generation, approval, execution
│   ├── orchestration_service.py # Agent-to-agent delegation
│   ├── permission_service.py  # App access filtering & tool resolution
│   ├── mcp_client.py          # External MCP server connections
│   ├── app_services.py        # App registry & workspace permissions
│   ├── policy_engine.py       # Ownership authorization checks
│   └── prompt_templates.py    # Server-side prompt rendering
├── tools/                     # Tool system
│   ├── base.py                # ToolDefinition, AppDefinition, ToolAction
│   ├── registry.py            # Singleton ToolRegistry
│   ├── handlers.py            # Generic CRUD handler factory
│   └── apps/                  # App tool registrations (8 apps)
│       ├── pyramids.py
│       ├── product_definitions.py
│       ├── technical_architectures.py
│       ├── ui_ux_architectures.py
│       ├── technical_tasks.py
│       ├── diagrams.py
│       ├── context_documents.py
│       └── pipelines.py
├── ai/                        # LLM integration
│   └── models.py              # Model factory (get_chat_model)
└── tests/                     # Pytest tests
```

---

## Service Layer

### auth.py — Authentication
- Validates Firebase ID tokens from `Authorization: Bearer <token>` header
- Returns `AuthedUser(firebase_uid)` used as FastAPI dependency on all endpoints
- `firebase_uid` is the canonical user identifier across the system

### agents.py — Agent Management
- CRUD operations on `agents` Firestore collection
- `create_default_gm_agent()`: Creates GM agent named "Jeana" with position "General Manager" (isDefault=true, isOrchestrator=true)
- Agent fields: name, type (gm|custom), modelMode, modelProvider, modelName, context (system prompt), skills, appAccess, mcpServers, orchestratorConfig
- Cannot delete default agents

### session_service.py — Session Management
- CRUD on `sessions` Firestore collection
- `add_message()`: Appends to session.messages array (roles: user, assistant, tool_call, tool_result)
- `generate_session_title()`: Auto-titles from first user message
- Sessions have status: active | paused | completed
- `parentSessionId` for delegation sub-sessions
- Plan data stored in `session.metadata.plan`

### chat_service.py — Conversational Chat (No Tools)
- Simple question-answer without tool execution
- Builds LangChain messages from agent context + history
- Respects agent modelMode (auto/manual) and provider/model overrides
- Used by: session messages (when agent has no tools or session is chat_only), recommendations, orchestration fallback, planning

### execution_service.py — Tool Execution Engine
- Main execution loop: LLM call -> tool calls -> results -> repeat (max 10 iterations)
- `_build_langchain_tools()`: Converts ToolDefinitions to LangChain StructuredTools with JSON Schema
- `_build_system_prompt()`: Combines agent context + app definitions + user context
- `_build_messages()`: Reconstructs LangChain message list from session history (handles tool_call/tool_result)
- Stores tool_call and tool_result messages in session per iteration
- Returns: `{response, model, tool_calls: [{tool_id, args, result}], messages_added}`

### planning_service.py — Structured Planning
- `should_use_planning()`: Heuristic detection (keywords + complexity indicators)
- `generate_plan()`: LLM generates JSON plan with steps [{id, description, tool_id, args}]
- `approve_plan()`: Transitions plan from awaiting_approval -> executing
- `execute_plan()`: Runs all pending steps sequentially, stops on first failure
- `execute_step()`: Single step — no tool_id marks complete, has tool_id executes via handler
- `skip_step()`: User can skip a pending step
- Plan stored in `session.metadata.plan` (not a separate collection)
- Plan status flow: awaiting_approval -> executing -> completed | failed

### orchestration_service.py — Multi-Agent Delegation
- `find_agents_for_task()`: Discovers specialist agents by appAccess (filters out orchestrators)
- `delegate()`: Creates sub-session -> adds task message -> executes target agent -> stores delegation trace in parent
- `build_delegate_tool_handler()`: Factory for `__delegate__` tool used by orchestrator agents
- `MAX_DELEGATION_DEPTH = 3` to prevent infinite loops
- Delegation trace stored as tool_result message with metadata in parent session

### permission_service.py — Access Control
- `get_agent_tools()`: Returns ToolDefinitions filtered by agent's appAccess
  - GM with no explicit appAccess -> gets ALL tools
  - Custom agents -> filtered by appAccess[].permissions
- `can_execute()`: Boolean check if agent can run a specific tool_id
- `get_agent_app_definitions()`: Returns AppDefinitions for system prompt context
- Permissions model: `appAccess = [{appId, permissions: ["create","read","update","delete","list"]}]`

### mcp_client.py — External Tool Integration
- `McpClient`: HTTP client for a single MCP server (connect + discover tools + call tools)
- `McpConnectionManager`: Manages connections to multiple MCP servers per agent
- Tool IDs prefixed as `mcp:{server_name}:{tool_name}`
- Auth support: bearer token, API key
- 10-second timeout per HTTP call
- **Architecture note**: MCP is the preferred mechanism for external tools (Jira, Figma, etc.)

### policy_engine.py — Authorization
- `assert_workspace_owner()`: Verifies workspace.userId == firebase_uid
- `assert_agent_access()`: Verifies agent ownership via workspace chain
- Raises ForbiddenError or NotFoundError on failure

### app_services.py — App Registry
- `list_registered_apps()`: Returns all 8 AppId enum values
- `get_app_definition()`: Lookup app from ToolRegistry
- `get_workspace_app_permissions()`: Currently grants full access (extensible)

### prompt_templates.py — Prompt Templates
- `render_prompt(prompt_type, variables)`: Server-side prompt rendering
- Template types: pyramid_combined_question, pyramid_answer, pyramid_followup_question, etc.
- Used by `/recommend` endpoint for AI field suggestions

---

## Tool System

### Tool Registry (Singleton)
- Lazy-initialized via `get_tool_registry()`
- Auto-registers all 8 apps on first access (8 apps x 5 tools = 40 tools)
- `register_app()`: Registers AppDefinition + auto-registers its tools
- `get_tool()`, `list_tools()`, `get_tools_for_apps()`

### Tool Definitions
```
ToolDefinition:
  tool_id: "{app_id}.{action}"    # e.g., "pyramids.create"
  app_id: str
  action: ToolAction               # CREATE | READ | UPDATE | DELETE | LIST
  name, description: str
  parameters: dict                  # JSON Schema for input args
  handler: Callable(db, workspace_id, user_id, params) -> dict
```

### Generic CRUD Handler Factory (handlers.py)
- `make_crud_handlers(collection_name, app_id, create_defaults, updatable_fields)` -> dict of 5 handlers
- Handlers enforce workspace isolation on all operations
- JSON safety: converts datetimes to ISO strings via `_make_json_safe()`
- Create: adds userId, workspaceId, createdAt, updatedAt
- Read/Update/Delete: verifies workspaceId matches
- List: returns all docs in workspace

### Registered Apps (8)

| App ID | Collection | Description |
|--------|-----------|-------------|
| pyramids | pyramids | Problem-solving tree (blocks + connections) |
| product_definitions | productDefinitions | Product planning with hierarchical nodes |
| technical_architectures | technicalArchitectures | System architecture documentation |
| ui_ux_architectures | uiUxArchitectures | UI/UX design specifications |
| technical_tasks | technicalTasks | Task/requirement tracking |
| diagrams | diagrams | Visual diagram representations |
| context_documents | contextDocuments | General-purpose knowledge base |
| pipelines | pipelines | Process/workflow definitions |

### External Tools via MCP
- MCP servers configured per agent (mcpServers array)
- Tool IDs: `mcp:{server_name}:{tool_name}`
- Discovered at request time via HTTP POST to /tools/list
- Executed via HTTP POST to /tools/call
- **Future external integrations** (Jira, Figma, etc.) should use MCP servers

---

## API Endpoints

### Workspace Setup
| Method | Path | Description |
|--------|------|-------------|
| POST | /workspaces/setup | Create Qdrant collection + default GM agent (atomic with rollback) |
| GET | /workspaces/{id} | Get workspace with agent config |

### Agents
| Method | Path | Description |
|--------|------|-------------|
| GET | /agents | List agents for workspace |
| GET | /agents/{id} | Get single agent |
| POST | /agents | Create custom agent |
| PUT | /agents/{id} | Update agent config |
| DELETE | /agents/{id} | Delete agent (not default) |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| POST | /sessions | Create session (supports `chat_only` flag) |
| GET | /sessions | List sessions (filters: agent_id, status) |
| GET | /sessions/{id} | Get session with messages |
| POST | /sessions/{id}/messages | Send message & get response (skips tools if chat_only) |
| DELETE | /sessions/{id} | Delete session permanently |
| PATCH | /sessions/{id} | Update session status |

### Plans
| Method | Path | Description |
|--------|------|-------------|
| GET | /sessions/{id}/plan | Get session plan |
| POST | /sessions/{id}/plan/approve | Approve plan for execution |
| POST | /sessions/{id}/plan/execute | Execute all pending steps |
| POST | /sessions/{id}/plan/steps/{step_id}/skip | Skip a step |

### Apps & Models
| Method | Path | Description |
|--------|------|-------------|
| GET | /apps | List registered apps |
| GET | /apps/workspaces/{id}/permissions | Get app permissions for workspace |
| GET | /models | List LLM providers and models |

### Recommendations
| Method | Path | Description |
|--------|------|-------------|
| GET | /recommend/prompt-types | List prompt templates |
| POST | /recommend | Generate AI recommendation |

---

## Request Flows

### Message with Tools
```
POST /sessions/{id}/messages {message, context}
  ├── Auth: verify Firebase token
  ├── Load session + agent from Firestore
  ├── add_message(role="user", content=message)
  ├── Check session.metadata.chatOnly → if true, skip tools
  ├── PermissionService.get_agent_tools(agent) -> [ToolDefinition, ...]
  ├── ExecutionService.execute():
  │   ├── Build system prompt (agent context + app definitions + user context)
  │   ├── Build LangChain messages from session history
  │   ├── Bind tools to LLM
  │   └── Loop (max 10):
  │       ├── LLM.invoke(messages)
  │       ├── If tool_calls:
  │       │   ├── For each: can_execute() check
  │       │   ├── handler(db, workspace_id, user_id, args)
  │       │   ├── Store tool_call + tool_result messages
  │       │   └── Append ToolMessage to context
  │       └── Else: return response text
  ├── add_message(role="assistant", content=response)
  └── Return {userMessage, assistantMessage, model, toolCalls}
```

### Orchestration Delegation
```
GM agent receives task requiring specialist
  ├── LLM calls __delegate__ tool {task, agent_id or app_ids}
  ├── OrchestrationService.find_agents_for_task() -> specialist agent
  ├── Create sub-session (parentSessionId = GM session)
  ├── ExecutionService.execute() on sub-session with specialist agent
  ├── Complete sub-session
  ├── Store delegation_trace in parent session
  └── Return result to GM agent's LLM loop
```

### Workspace Setup
```
POST /workspaces/setup {workspace_id, name}
  ├── Verify workspace exists & user owns it
  ├── Create Qdrant collection "workspace_{id}"
  ├── Create default GM agent
  ├── Update workspace.gmAgentId in Firestore
  └── On error: rollback agent + Qdrant collection
```

---

## Data Models (Firestore)

### agents/{agentId}
```
workspaceId, userId, name, type ("gm"|"custom")
position (string, e.g. "General Manager"), color (hex string, e.g. "#6366f1")
modelMode ("auto"|"manual"), modelProvider, modelName
skills[], context (system prompt)
isDefault, isOrchestrator
appAccess: [{appId, permissions: ["create","read","update","delete","list"]}]
mcpServers: [{name, url, auth: {type, token/key}}]
orchestratorConfig: {canDelegateToAgents, autoSelectAgent, fallbackBehavior}
createdAt, updatedAt
```

### sessions/{sessionId}
```
workspaceId, agentId, userId, title, status ("active"|"paused"|"completed")
messages: [{id, role, content, timestamp, metadata}]
metadata: {chatOnly?: boolean, plan?: {goal, status, steps: [{id, description, tool_id, args, status, result}]}}
parentSessionId (for sub-sessions)
createdAt, updatedAt
```

### App collections (pyramids, productDefinitions, etc.)
```
userId, workspaceId, createdAt, updatedAt
+ app-specific fields
```

---

## Key Architecture Decisions

1. **Stateless per-request**: No in-memory state. All data from Firestore/Qdrant. Session history reconstructed each request.
2. **Tool system**: Generic CRUD factory + per-app registration. Tool ID = `{app_id}.{action}`. Permissions via appAccess filtering.
3. **MCP for external tools**: External integrations (Jira, Figma, etc.) use MCP protocol, not custom tool modules. Tool ID = `mcp:{server}:{tool}`.
4. **Workspace isolation**: All queries filter by workspaceId. Qdrant has separate collection per workspace.
5. **snake_case API / camelCase Firestore**: Conversion handled in API layer.
6. **Firebase Auth only**: `firebase_uid` is canonical user ID everywhere.
7. **Admin SDK writes**: Agent-platform uses Firebase Admin SDK (bypasses Firestore rules). Frontend has read-only access to agents/sessions.

---

## LLM Integration

- **Providers**: OpenAI, Anthropic, Gemini, Grok, DeepSeek
- **Factory**: `get_chat_model(config)` in `ai/models.py`
- **Tool binding**: LangChain `bind_tools()` with JSON Schema parameters
- **Agent override**: Each agent can specify modelMode (auto/manual) + provider + model name
- **System prompt**: Agent context + app descriptions + user-provided context

---

## Testing

- Framework: pytest with unittest.mock
- Fixtures in `tests/conftest.py`: mock Firestore, mock agents, mock sessions, mock tool registry
- All services testable in isolation via dependency injection
- 116 tests covering all 7 phases
