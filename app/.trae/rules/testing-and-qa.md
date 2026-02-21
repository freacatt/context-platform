---
alwaysApply: false
applyMode: intelligence
description: Definition of Done, testing rules, and QA checklist for all frontend changes.
globs:
  - "app/src/**"
  - "app/src/test/**"
---
# Testing & QA Rules

## CRITICAL — Definition of Done

A change is done ONLY when ALL are true:
- Feature works end-to-end (happy path + 2 edge cases)
- No console errors
- Typecheck/build passes (`npm run build`)
- Tests added/updated for new behavior
- If touching Firebase or AI: error states handled and safe

## MUST — Testing Rules

- ADD unit tests for any new logic (data transforms, prompt builders, store adapters)
- ADD component test if UI behavior changes
- ADD e2e test only if it changes a critical user flow
- NEVER hit real Anthropic API in tests — mock/fake client
- NEVER use real Firebase in unit tests — mock adapter or emulator
- DO NOT write tests for `.trae/` config/rule files

## MUST — Test Organization

- All tests in `app/src/test/`, mirroring source structure
- Example: `app/src/services/auth.ts` → `app/src/test/services/auth.test.ts`
- Tooling: Vitest for unit/component tests
- Naming: `*.test.ts(x)` next to source OR in `__tests__/` (be consistent per feature)
- Component: `PascalCase.tsx`, Hook: `useX.ts`

## MUST — Manual QA (Before PR)

Run in browser:
- [ ] App loads, navigation works, no console errors
- [ ] Core flow affected by change works after refresh

If you touched **Pyramids**:
- [ ] Create/edit/delete a node, verify persistence after refresh

If you touched **AI**:
- [ ] Missing API key → clear UI message
- [ ] One successful request using stub/mocked response

If you touched **Context Docs**:
- [ ] Add + remove doc, verify list updates and persistence

If you touched **Realtime Sync**:
- [ ] Open 2 tabs → change in A appears in B, no duplicated listeners

## SHOULD — PR Notes

Include in every PR:
- What changed (1-3 bullets)
- How to test (commands + clicks)
- Screenshots for UI changes
- Risk note if touching: Firebase paths/rules, auth, AI prompts
