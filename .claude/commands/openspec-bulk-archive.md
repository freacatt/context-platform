# OpenSpec: Bulk Archive Changes

Archive multiple completed changes at once with intelligent spec conflict resolution.

**Input**: $ARGUMENTS (ignored — prompts for selection)

## Steps

1. **Get active changes**
   ```bash
   openspec list --json
   ```
   If none, inform and stop.

2. **Prompt for selection**

   Multi-select: show each change with schema. Include "All changes" option.

   Do NOT auto-select.

3. **Batch validation**

   For each selected change, collect:
   - Artifact status via `openspec status --change "<name>" --json`
   - Task completion from tasks.md (`- [ ]` vs `- [x]`)
   - Delta specs from `openspec/changes/<name>/specs/`

4. **Detect spec conflicts**

   Map: `capability -> [changes that touch it]`
   Conflict = 2+ changes with delta specs for same capability.

5. **Resolve conflicts**

   For each conflict:
   - Read delta specs from conflicting changes
   - Search codebase for implementation evidence
   - Resolution: one implemented → sync that one; both → chronological order; neither → skip with warning

6. **Show status table**

   ```
   | Change | Artifacts | Tasks | Specs | Conflicts | Status |
   |--------|-----------|-------|-------|-----------|--------|
   | ...    | Done      | 5/5   | 2     | None      | Ready  |
   ```

   Show conflict resolutions and warnings for incomplete changes.

7. **Confirm**

   Single confirmation: "Archive N changes?" with options for all, ready-only, or cancel.

8. **Execute**

   In resolved order:
   - Sync specs if delta specs exist (agent-driven merge)
   - Archive: `mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>`
   - Track outcomes: success/failed/skipped

9. **Summary**

   ```
   ## Bulk Archive Complete
   Archived N changes: [list with archive paths]
   Spec sync: N synced, M conflicts resolved
   ```

## Guardrails
- Always prompt, never auto-select
- Detect conflicts early, resolve by checking codebase
- Both implemented → chronological order
- Single confirmation for entire batch
- If archive target exists, fail that change but continue others
- Preserve `.openspec.yaml` when archiving
