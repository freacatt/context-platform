# OpenSpec: Verify Change

Verify that implementation matches the change artifacts (specs, tasks, design).

**Input**: $ARGUMENTS (optional change name)

## Steps

1. **If no change name provided, prompt for selection**

   Run `openspec list --json`. Let user select. Show changes with tasks. Mark incomplete as "(In Progress)".

   Do NOT guess or auto-select.

2. **Check status**
   ```bash
   openspec status --change "<name>" --json
   ```

3. **Load artifacts**
   ```bash
   openspec instructions apply --change "<name>" --json
   ```
   Read all available artifacts from `contextFiles`.

4. **Verify Completeness**

   **Task Completion**: Read tasks.md, count `- [ ]` vs `- [x]`. Incomplete → CRITICAL issue.

   **Spec Coverage**: For delta specs in `openspec/changes/<name>/specs/`, extract requirements. Search codebase for implementation evidence. Missing → CRITICAL issue.

5. **Verify Correctness**

   **Requirement Mapping**: Search codebase for each requirement's implementation. Note files/lines. Divergence → WARNING.

   **Scenario Coverage**: Check if scenarios from specs are handled in code/tests. Uncovered → WARNING.

6. **Verify Coherence**

   **Design Adherence**: If design.md exists, check implementation follows decisions. Contradiction → WARNING.

   **Pattern Consistency**: Check new code follows project patterns. Deviation → SUGGESTION.

7. **Generate Report**

   ```
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |
   ```

   Issues grouped by: CRITICAL (must fix) → WARNING (should fix) → SUGGESTION (nice to fix).

   Each with specific, actionable recommendation and file references.

   **Final Assessment**: CRITICAL → "Fix before archiving." | Only warnings → "Ready for archive with improvements." | Clear → "All checks passed."

## Heuristics
- Completeness: objective checklists
- Correctness: keyword search + reasonable inference
- Coherence: glaring inconsistencies only
- Uncertain → prefer lower severity
- Every issue must have actionable recommendation

## Graceful Degradation
- Only tasks.md → verify task completion only
- Tasks + specs → completeness + correctness
- Full artifacts → all three dimensions
