---
alwaysApply: false
applyMode: intelligence
description: Rules for the AI Assistant chat app.
globs:
  - "app/src/**/AiChat*"
  - "app/src/**/aiService*"
  - "app/src/**/anthropic*"
  - "app/src/**/Chat/**"
category: "AI Apps"
primaryColorClass: "bg-violet-600"
---
# AI Assistant Rules

## CRITICAL
- Every message MUST have a valid `role` (`user`, `assistant`). Legacy `conversations` role normalized to `user` on read.
- AI calls MUST NOT execute without a configured API key — show clear error in UI.
- ALL persistence MUST go through chat service and storage adapter — NEVER use localStorage or direct Firestore calls.

## Data Model
- Uses existing `Conversation` and `StoredMessage` types in `app/src/types/index.ts` — no dedicated entity.
- Main page: `app/src/pages/AiChatPage.tsx`
- AI orchestration: `app/src/services/aiService.ts`, `app/src/services/anthropic.ts`

## Core Logic
- **Conversation List**: Subscribes via `subscribeToConversations`, auto-selects most recent. Supports create/delete.
- **Chat Stream**: Subscribes to messages via `subscribeToChat`. Renders with shared AI UI components.
- **Global Context**: Reads from `useGlobalContext`, passes into AI service for workspace-aware responses.

## AI Call Flow
- `processGlobalChat`: Save user message → convert history to `ChatMessage[]` → call `sendGlobalChatMessage` with global + page context → save AI reply.
- `processProductDefinitionChat`: Same flow but includes `ProductDefinition` and richer structured context.
