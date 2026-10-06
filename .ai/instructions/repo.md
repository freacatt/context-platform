# Repo Instructions — context-platform

## High-level architecture
- Pages (`src/pages/`):
  - Route-level orchestration only.
  - No business logic.
- Components (`src/components/`):
  - Pure UI + minimal state.
- Services (`src/services/`):
  - Convex functions (data + auth), persistence, side effects.
- Hooks (`src/hooks/`):
  - Reusable stateful logic.
- Types (`src/types/`):
  - Central source of truth for data contracts.

## Testing strategy
### Unit / functionality tests
- Target:
  - services/
  - hooks/
  - pure utility logic
- Focus:
  - inputs → outputs
  - error handling
  - edge cases
- Avoid:
  - DOM rendering
  - network calls (mock them)

### UI tests
- Target:
  - pages/
  - critical user flows
- Validate:
  - visible behavior
  - user interaction
  - integration of components
- Avoid:
  - snapshot-only tests
  - internal state assertions

## Commands (must be verified in package.json)
- Dev: npm run dev
- Test: npm test (likely Vitest)
- Build: npm run build
- Deploy: npm run deploy

## Security & secrets
- Auth is Convex Auth (email/password); every function resolves the user server-side.
- Never hardcode or log secrets.
- No secrets in commits or tests.

## UI consistency
- Prefer existing Tailwind patterns.
- Reuse Radix / UI primitives where available.
- New components must be composable and reusable.