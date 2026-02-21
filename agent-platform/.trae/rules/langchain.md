---
alwaysApply: false
applyMode: intelligence
description: LangChain integration architecture for agent execution, orchestration, and RAG.
globs:
  - "agent-platform/**"
---
# LangChain Architecture

LangChain is the **agent execution framework** — NOT the API layer, permission system, database layer, or identity layer. It lives strictly inside the Agent Server.

## CRITICAL — Design Principles

- LangChain is execution engine, not architecture.
- No implicit state — each request rebuilds chain, executes, discards runtime state.
- No cross-agent shortcuts — all delegation explicit through GM.
- All tools permission-aware via Policy Engine.
- RAG strictly workspace-scoped.
- Deterministic structured outputs only (JSON schema parsers, Pydantic models).

## Three LangChain Layers

1. **GM Agent Chain** — AgentExecutor with tools (`call_product_agent`, `call_problem_agent`, etc.)
2. **Domain Agent Chains** — Runnable/AgentExecutor with optional RAG, cannot call each other
3. **RAG Chains** — Query → Qdrant Retriever → Context Formatter → Prompt → LLM

## GM Rules

- GM delegates through registered tools ONLY.
- GM MUST NOT query databases directly.
- GM MUST NOT bypass policy checks.
- Each tool calls internal backend logic that triggers the corresponding Domain Agent chain.

## Domain Agent Rules

- Cannot call each other directly — must go through controlled service wrappers.
- Cannot access DB directly.
- Each agent: System Prompt + optional RAG + Structured Output Parser + LLM.

## Direct Agent Mode Flow

FastAPI → Load conversation → Build LangChain context → Optional RAG → LLM call → Response.

## GM-Orchestrated Mode Flow

User → GM Chain → GM decides tool → Backend executes tool wrapper → Domain Agent Chain → Result to GM → GM synthesizes output.

## Model Configuration

- All models created through factory in `agent-platform/ai_models.py`.
- Config via env vars with `AGENT_PLATFORM_` prefix (e.g., `AGENT_PLATFORM_LLM_PROVIDER`, `AGENT_PLATFORM_LLM_MODEL`).
- Providers: `openai`, `anthropic`, `gemini`, `grok`, `deepseek`.
- Domain code MUST call `get_chat_model(config)` / `get_embeddings_model()` — NEVER construct models directly.
- Each agent has `AgentModelConfig` with `mode` (`auto`/`manual`) and provider/model selection.

## Memory Handling

- NO persistent LangChain memory objects.
- Conversation history stored in PostgreSQL, injected into prompt context, trimmed by token limits.

## Tool Design

- Tools are thin wrappers: validate permissions → call service layer → return structured output → never write to DB directly.
- Tools live in `agent-platform/app_services.py`.
- MUST be idempotent where possible, enforce workspace boundaries, log usage.

## Error Handling

| Failure | Response |
|---------|----------|
| LLM failure | Retry once, fallback to simplified prompt |
| Tool failure | Return structured error, GM decides fallback |
| RAG failure | Continue without retrieval |

## Cost Control

- Before LLM call: estimate tokens, check usage limits, log predicted cost.
- After LLM call: log actual tokens, persist usage in PostgreSQL.
- LangChain callbacks used for token tracking.
