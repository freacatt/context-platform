## Why

The mind-map Product Definition was a fixed questionnaire: answers were free text, nothing could be referenced or reused, and templates fixed the structure. Other apps (plans, research, roadmap) need to rely on concrete product entities.

## What Changes

- **BREAKING** Product Definition becomes a structured product model: vision, problem (statement, context, alternatives), personas (goals, pains), jobs to be done, features (priority, status, personas, acceptance criteria), requirements (functional/non-functional), non-goals, success metrics, assumptions (confidence, status, evidence), risks and notes. Templates and the mind map are removed.
- Previous-version documents open as specs: well-known topics fill vision/problem/context/alternatives and every answer is kept under notes; the old data is dropped on the first save. Backups of the old format import the same way.

## Capabilities

### New Capabilities
- `product-definition`: The product model, its editor and export, and reading the previous version.

### Modified Capabilities

## Impact

`shared/specs/productSpec.ts`, `convex/productDefinitions.ts` (`update` replaces `updateNode`, template arg removed), schema (`spec`, optional legacy `data`), `src/features/productDefinitions/` rewritten, `shared/productDefinitionTemplates.ts` removed, backups.
