# Base Instructions (applies to all agents)

## Core principles
- Correctness > completeness > speed.
- Small, focused diffs. No unrelated refactors.
- Read before write. Inspect existing patterns first.
- Never claim verification without commands + results.
- Prefer explicitness over magic.

## Project architecture awareness
- UI is React + TS. Business logic must NOT live in UI components.
- Data access goes through Convex functions in `app/convex/`; UI calls them with `useQuery`/`useMutation` from feature folders in `app/src/features/`.
- Shared state belongs in `contexts/` or custom hooks, not page components.
- Pages orchestrate components; components do not orchestrate services.

## Testing philosophy (mandatory)
- Every behavior change must be covered by at least ONE of:
  - Unit/functionality test
  - UI test
- Bugs → reproduce with a test first when feasible.
- Tests must validate behavior, not implementation details.

## Definition of Done (DoD)
A task is done only if:
- App builds and runs.
- Correct tests exist (unit or UI).
- Tests are executed OR explicitly blocked with reason.
- No TypeScript errors introduced.
- Architecture rules respected.

## Standard output format (MANDATORY)
### Summary
What changed and why.

### Changes
- File path → purpose.

### Tests
- Command(s) run
- Pass/fail
- Short output summary

### Risks / Notes
- Assumptions
- Follow-ups
- Known limitations