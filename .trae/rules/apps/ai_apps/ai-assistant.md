---
alwaysApply: false
category: "AI Apps"
primaryColorClass: "bg-violet-600"
---

# AI Assistant Rules

## Data Structure

The AI Assistant is a chat-style app and does not introduce a new persisted domain entity. It uses the existing `Conversation` and `StoredMessage` types defined in [src/types/index.ts](file:///home/pouria/projects/pyramid-solver/src/types/index.ts).

These types represent:
- **Conversation**: A chat session with metadata (id, userId, title, timestamps).
- **StoredMessage**: Individual messages in a conversation, with role (`user` or `assistant`) and content (string or rich content array).

Conversations and messages are stored via the shared chat service and storage adapter; there is no dedicated `AiAssistant` data model.

## Logic & Rules

The main UI page for the AI Assistant is implemented in [src/pages/AiChatPage.tsx](file:///home/pouria/projects/pyramid-solver/src/pages/AiChatPage.tsx). It provides:
- **Conversation List**:
  - Subscribes to the user's conversations via `subscribeToConversations`.
  - Automatically selects the most recently updated conversation on load.
  - Allows creating a new conversation and deleting existing ones.
- **Chat Stream**:
  - Subscribes to messages for the active conversation via `subscribeToChat`.
  - Renders user and assistant messages using shared AI UI components (`Conversation`, `Message`, `PromptInput`, etc.).
- **Global Context Integration**:
  - Reads the aggregated global context from `useGlobalContext`.
  - Passes this context into the AI service so responses are aware of the user's workspace data.

The orchestration logic for AI calls lives in [src/services/aiService.ts](file:///home/pouria/projects/pyramid-solver/src/services/aiService.ts) and [src/services/anthropic.ts](file:///home/pouria/projects/pyramid-solver/src/services/anthropic.ts):
- **Global Chat Flow** (`processGlobalChat`):
  1. Saves the user message to the current conversation.
  2. Converts conversation history (`StoredMessage[]`) into plain-text `ChatMessage[]`.
  3. Calls `sendGlobalChatMessage` with the global context and current page context.
  4. Saves the AI reply as an assistant message in the same conversation.
- **Product Definition Chat Flow** (`processProductDefinitionChat`):
  - Mirrors the global chat flow but includes a `ProductDefinition` and richer structured context in the prompt.

### Invariants
- Every message stored in a conversation must have a valid `role` (`user`, `assistant`, or legacy `conversations` which is normalized to `user` when reading).
- AI calls must never execute if the user has not configured an API key; the UI must show a clear error instead.
- The AI Assistant must always route persistence through the chat service and underlying storage adapter; it must not use localStorage or direct Firestore calls.

