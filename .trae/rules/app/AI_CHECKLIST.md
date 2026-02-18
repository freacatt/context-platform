# AI_CHECKLIST.md (Context Platform)
---
alwaysApply: true
applyMode: intelligence
description: Definition of Done, testing, and QA rules for all changes in this repo.
---
# AI_CHECKLIST.md (Context Platform)

Use this file as the contract for any change. A change is **done** only if it passes these checks.

---

## 1) Definition of Done (must all be true)
- Feature works end-to-end (happy path + 2 key edge cases)
- No console errors
- Typecheck/build passes
- Tests added/updated for new behavior
- If touching Firebase or AI: error states handled and safe

---

## 2) Where code must go (structure rules)
Follow existing repo structure under `app/src/` for the frontend:

- `app/src/pages/` route screens (compose UI + load data; keep thin)
- `app/src/components/` reusable UI components
- `app/src/components/ui/` generic primitives only
- `app/src/hooks/` state/actions hooks (logic lives here)
- `app/src/contexts/` global context (auth/app-wide state)
- `app/src/services/` side effects + integrations (Firebase, Anthropic)
- `app/src/types/` shared domain types

Rules:
- If reused 2+ times → `components/`
- External calls / side effects → `services/`
- Business logic/state transitions → `hooks/` (or pure utilities if needed)
- Shared shapes/interfaces → `types/`

Naming:
- Component: `PascalCase.tsx`
- Hook: `useX.ts`
- Tests: `*.test.ts(x)` next to source OR `__tests__/` (be consistent per feature)

---

## 3) Testing rules (minimum)
### Always
- Add unit tests for any new logic (data transforms, prompt builders, store adapters)
- Add component test if UI behavior changes
- Add e2e test only if it changes a critical user flow

### Never
- Never hit real Anthropic API in tests (mock/fake client)
- Avoid real Firebase in unit tests (mock adapter or emulator)

---

## 4) Required manual QA (run before PR)
Do these in the browser:
- App loads, navigation works, no console errors
- Core flow affected by your change works after refresh

If you touched **Pyramids**
- Create/edit/delete a node, verify persistence after refresh

If you touched **AI**
- Missing API key → clear UI message
- One successful request using stub/mocked response (or emulator/dev key)

If you touched **Context Docs**
- Add + remove doc, verify list updates and persistence

If you touched **Realtime Sync**
- Open 2 tabs → change in A appears in B, no duplicated listeners after navigation

---

## 5) PR Notes (must include)
- What changed (1–3 bullets)
- How to test (commands + clicks)
- Screenshots for UI changes
- Risk note if it touches: Firebase paths/rules, auth, AI prompts
