---
alwaysApply: false
description: we should use this rules file only when we wantcreate or update anything in logic of agents in agent-platform and anything that we haveabout agents and ai in "agent-platform/"
---
## LangChain Architecture Specification  

**Purpose:** Define how LangChain is integrated into the multi-agent system  
**Scope:** Agent execution layer, orchestration layer, RAG layer  

---

# 1. Why LangChain?

LangChain is used as the **agent execution framework**, not as the system architecture.

It is responsible for:

- Prompt orchestration
- Tool calling
- Structured outputs
- Agent execution flow
- Memory abstraction (conversation context injection)
- RAG chain composition

LangChain is NOT:

- The API layer
- The permission system
- The database layer
- The identity layer

It lives strictly inside the Agent Server.

---

# 2. Where LangChain Sits in the Architecture

Client  
↓  
FastAPI (Routing Layer)  
↓  
Execution Layer (LangChain)  
↓  
LLM Provider  

LangChain is used only inside:

- General Manager (GM)
- Domain Agents
- RAG Service

---

# 3. High-Level LangChain Layer Design

The system uses three logical LangChain layers:

1. GM Agent Chain
2. Domain Agent Chains
3. RAG Chains

Each chain is isolated and stateless per request.

---

# 4. General Manager (GM) Architecture

The GM is implemented as a LangChain **Agent with Tools**.

## GM Responsibilities

- Intent detection
- Task decomposition
- Agent selection
- Delegation planning
- Result aggregation

## GM Structure

GM Agent (LangChain AgentExecutor)  
├── Tool: call_product_agent  
├── Tool: call_problem_agent  
├── Tool: call_ui_agent  
└── Tool: call_strategy_agent  

Each tool:

- Does NOT call LLM directly.
- Calls internal backend logic that triggers the corresponding Domain Agent chain.

Important rule:

> GM never directly queries databases.  
> GM never bypasses policy checks.  
> GM only delegates through registered tools.

---

# 5. Domain Agent Architecture

Each domain agent is implemented as:

- A LangChain Runnable / AgentExecutor
- With optional tool access
- With optional RAG chain injection

Example:

Product Agent  
├── System Prompt  
├── RAG Retriever (optional)  
├── Structured Output Parser  
└── LLM  

Domain agents:

- Cannot call each other directly.
- Cannot access DB directly.
- Must go through controlled service wrappers.

---

# 6. Direct Agent Mode (LangChain Flow)

When user talks directly to an agent:

FastAPI  
↓  
Load conversation  
↓  
Build LangChain context  
↓  
Optional RAG retrieval  
↓  
LLM call  
↓  
Return response  

No GM involvement.

---

# 7. GM-Orchestrated Mode (LangChain Flow)

User → GM Chain  
↓  
GM decides tool call  
↓  
Backend executes tool wrapper  
↓  
Domain Agent Chain executes  
↓  
Return result to GM  
↓  
GM synthesizes final output  

Key architectural rule:

Domain Agents never see each other directly.  
All cross-agent interaction flows through GM.

---

# 8. RAG Architecture with LangChain

RAG is implemented as a composable chain:

User Query  
↓  
Retriever (Qdrant)  
↓  
Context Formatter  
↓  
Prompt Template  
↓  
LLM  

RAG pipeline components:

- Vector store retriever
- Metadata filtering (workspace_id mandatory)
- Context compression (optional)
- Prompt injection

Important rule:

Workspace ID must always be injected as metadata filter before retrieval.

---

# 9. Model Configuration and Providers

All LangChain models (chat and embeddings) must be created through the unified model factory in the Agent Server:

- Chat models and embeddings are configured in `agent-platform/ai_models.py`.  
- Configuration is driven only by environment variables with `AGENT_PLATFORM_` prefix:
  - `AGENT_PLATFORM_LLM_PROVIDER` (`openai`, `anthropic`, `gemini`, `grok`, `deepseek`)
  - `AGENT_PLATFORM_LLM_MODEL`
  - `AGENT_PLATFORM_EMBEDDINGS_PROVIDER` (`openai`, `anthropic`, `gemini`)
  - `AGENT_PLATFORM_EMBEDDINGS_MODEL`
  - `AGENT_PLATFORM_ANTHROPIC_API_KEY`
  - `AGENT_PLATFORM_OPENAI_API_KEY`
  - `AGENT_PLATFORM_OPENAI_BASE_URL`
  - `AGENT_PLATFORM_GEMINI_API_KEY`
  - `AGENT_PLATFORM_GROK_API_KEY`
  - `AGENT_PLATFORM_GROK_BASE_URL`
  - `AGENT_PLATFORM_DEEPSEEK_API_KEY`
  - `AGENT_PLATFORM_DEEPSEEK_BASE_URL`
- Domain code and tools must not construct LangChain models directly. They call:
  - `get_chat_model(config)` for chat models
  - `get_embeddings_model()` for embeddings

Model registry:

- All supported chat models are declared in `LLM_MODELS` in `ai_models.py`.  
- Each entry specifies provider, model name, label, and optional context window.  
- Embedding models are declared per provider in `EMBEDDING_MODELS`.  

Agent-level selection:

- Each agent has a `AgentModelConfig` with:
  - `mode`: `"auto"` or `"manual"`
  - `provider`: one of `openai`, `anthropic`, `gemini`, `grok`, `deepseek` (manual mode)
  - `model`: concrete model name from the registry (manual mode)
- In `auto` mode, `get_chat_model()` uses the global defaults from `Settings`:
  - `AGENT_PLATFORM_LLM_PROVIDER`
  - `AGENT_PLATFORM_LLM_MODEL`

This guarantees:

- A single place to change models and providers
- Centralized credential handling
- Consistent behavior across GM, domain agents, and RAG

---

# 10. Memory Handling Strategy

We DO NOT use persistent LangChain memory objects.

Instead:

- Conversation history stored in PostgreSQL
- Injected manually into prompt context
- Trimmed based on token limits

Why:

- Full control over cost
- Deterministic memory management
- No hidden state

LangChain memory abstractions are optional and avoided for production control.

---

# 11. Tool Design Pattern

Tools in LangChain are thin wrappers.

Each tool:

1. Validates permissions
2. Calls internal service layer
3. Returns structured output
4. Never directly writes to DB

The internal service layer for app access lives in the Agent Server:

- App services and per-app permission calculations are implemented in `agent-platform/app_services.py`.  
- Tools call app services instead of talking to Firestore or other data planes directly.  
- Policy checks and workspace ownership validation are enforced with `PolicyEngine` before calling app services.

All tool functions must:

- Be idempotent where possible
- Enforce workspace boundaries
- Log usage

---

# 12. Structured Output Enforcement

All agents must use:

- JSON schema output parsers
- Pydantic models
- Deterministic formatting

Never allow free-form uncontrolled outputs for actions.

---

# 13. Stateless Execution Model

Each request:

- Rebuilds chain
- Injects context
- Executes
- Discards runtime state

No long-lived LangChain objects stored in memory.

Why:

- Horizontal scalability
- Cloud Run compatibility
- No shared state issues

---

# 14. Error Handling Strategy

LLM Failure:

- Retry once
- Fallback to simplified prompt

Tool Failure:

- Return structured error
- GM decides fallback

RAG Failure:

- Continue without retrieval

---

# 14. Cost Control Strategy Inside LangChain

Before each LLM call:

- Estimate tokens
- Check usage limits
- Log predicted cost

After call:

- Log actual tokens
- Persist usage in PostgreSQL

LangChain callbacks are used for token tracking.

---

# 15. Design Principles

1. LangChain is execution engine, not architecture.
2. No implicit state.
3. No cross-agent shortcuts.
4. All delegation explicit.
5. All tools permission-aware.
6. RAG strictly workspace-scoped.
7. Deterministic structured outputs only.

---

# 16. What We Are NOT Using from LangChain

- Long-term memory storage
- Multi-agent autonomous loops
- Experimental graph auto-routing
- Implicit tool recursion
- Black-box orchestration

We keep orchestration deterministic and controlled.

---

# 17. Summary

LangChain in this system:

- Powers GM agent
- Powers domain agents
- Powers RAG chains
- Handles tool calling
- Handles structured outputs
- Provides callback-based cost tracking

It does NOT:

- Control identity
- Control permissions
- Control database
- Replace backend services
