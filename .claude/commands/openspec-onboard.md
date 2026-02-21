# OpenSpec: Guided Onboarding

Guide the user through their first complete OpenSpec workflow cycle. This is a teaching experience — do real work while explaining each step.

## Preflight

```bash
openspec status --json 2>&1 || echo "NOT_INITIALIZED"
```

If not initialized:
> OpenSpec isn't set up in this project yet. Run `openspec init` first, then come back.

Stop if not initialized.

## Phase 1: Welcome

```
## Welcome to OpenSpec!

I'll walk you through a complete change cycle using a real task in your codebase.

**What we'll do:**
1. Pick a small, real task
2. Explore the problem
3. Create a change container
4. Build artifacts: proposal → specs → design → tasks
5. Implement the tasks
6. Archive the completed change

Let's find something to work on.
```

## Phase 2: Task Selection

Scan the codebase for small improvements:
- TODO/FIXME/HACK/XXX comments
- Missing error handling, swallowed catches
- Functions without tests
- TypeScript `any` types
- Debug artifacts (`console.log`, `debugger`)
- Missing input validation

Present 3-4 specific suggestions with location, scope, and why it's good. Include "Something else?" option.

If user picks something too large, gently suggest slicing smaller (soft guardrail — let them override).

## Phase 3: Explore Demo

Brief exploration of selected task (1-2 minutes): read files, draw ASCII diagram if helpful, note considerations.

Mention: "Explore mode (`/project:openspec-explore`) is for this kind of thinking."

**PAUSE** — wait for acknowledgment.

## Phase 4: Create the Change

**EXPLAIN**: A "change" is a container in `openspec/changes/<name>/` holding artifacts.

**DO**: `openspec new change "<derived-name>"`

**SHOW**: Folder structure (proposal.md, design.md, specs/, tasks.md).

## Phase 5: Proposal

**EXPLAIN**: Captures WHY — the elevator pitch.

**DO**: Draft proposal (Why, What Changes, Capabilities, Impact). Show before saving.

**PAUSE** — wait for approval, then save.

## Phase 6: Specs

**EXPLAIN**: Define WHAT in precise, testable terms (WHEN/THEN/AND format).

**DO**: Create spec file(s) with requirements and scenarios.

## Phase 7: Design

**EXPLAIN**: Captures HOW — technical decisions and tradeoffs.

**DO**: Draft design.md (Context, Goals/Non-Goals, Decisions).

## Phase 8: Tasks

**EXPLAIN**: Break into checkboxed implementation steps.

**DO**: Generate tasks from specs/design.

**PAUSE** — wait for confirmation to implement.

## Phase 9: Apply

**EXPLAIN**: Implement each task, checking off as you go.

**DO**: For each task: announce → implement → reference specs → mark complete → brief status.

Keep narration light.

## Phase 10: Archive

**EXPLAIN**: Archiving preserves decision history at `openspec/changes/archive/YYYY-MM-DD-<name>/`.

**DO**: `openspec archive "<name>"`

## Phase 11: Recap

```
## Congratulations!

Full OpenSpec cycle complete:
1. Explore → Thought through the problem
2. New → Created change container
3. Proposal → Captured WHY
4. Specs → Defined WHAT
5. Design → Decided HOW
6. Tasks → Broke into steps
7. Apply → Implemented
8. Archive → Preserved record

## Command Reference
| Command | What it does |
|---------|--------------|
| `/project:openspec-explore` | Think through problems |
| `/project:openspec-new` | Start new change, step by step |
| `/project:openspec-ff` | Fast-forward all artifacts |
| `/project:openspec-continue` | Continue existing change |
| `/project:openspec-apply` | Implement tasks |
| `/project:openspec-verify` | Verify implementation |
| `/project:openspec-archive` | Archive completed change |

Try `/project:openspec-new` or `/project:openspec-ff` on your next task!
```

## Graceful Exit

If user wants to stop: save progress, show how to resume (`/project:openspec-continue`), exit without pressure.

If user just wants commands: show reference table and exit.

## Guardrails
- Follow EXPLAIN → DO → SHOW → PAUSE pattern at key transitions
- Keep narration light during implementation
- Don't skip phases — the goal is teaching the workflow
- Use real codebase tasks, not simulations
- Handle exits gracefully
