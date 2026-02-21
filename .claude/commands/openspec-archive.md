# OpenSpec: Archive Change

Archive a completed change.

**Input**: $ARGUMENTS (optional change name)

## Steps

1. **If no change name provided, prompt for selection**

   Run `openspec list --json`. Let user select. Show only active (not archived) changes.

   Do NOT guess or auto-select.

2. **Check artifact completion**
   ```bash
   openspec status --change "<name>" --json
   ```
   If any artifacts not `done`: warn and confirm with user before proceeding.

3. **Check task completion**

   Read tasks file. Count `- [ ]` vs `- [x]`. If incomplete: warn and confirm.

4. **Assess delta spec sync**

   Check for delta specs at `openspec/changes/<name>/specs/`. If none, skip.

   If delta specs exist:
   - Compare with main specs at `openspec/specs/<capability>/spec.md`
   - Show summary of what would change
   - Offer: "Sync now (recommended)" or "Archive without syncing"
   - If user chooses sync, execute the sync logic from `/project:openspec-sync`

5. **Perform archive**
   ```bash
   mkdir -p openspec/changes/archive
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```
   If target exists, fail with suggestion to rename.

6. **Display summary**

   ```
   ## Archive Complete

   **Change:** <name>
   **Schema:** <schema>
   **Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
   **Specs:** Synced / No delta specs / Sync skipped
   ```

## Guardrails
- Always prompt for change selection if not provided
- Don't block on warnings — inform and confirm
- Preserve `.openspec.yaml` when moving
- If sync requested, use agent-driven intelligent merge
