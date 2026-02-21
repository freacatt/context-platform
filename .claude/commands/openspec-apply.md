# OpenSpec: Apply Change

Implement a change by working through its tasks using specs and design as guidance.

**Input**: $ARGUMENTS (optional change name)

## Steps

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Let the user select which change to implement.

   Show only changes that have tasks ready (not already archived).

   Do NOT guess or auto-select. Always let the user choose.

2. **Load change context**
   ```bash
   openspec instructions apply --change "<name>" --json
   ```
   Parse JSON for `specs`, `design`, `tasks`. Read all referenced artifact files.

3. **Work through tasks sequentially**

   For each incomplete task (`- [ ]`) in the tasks file:
   a. Announce which task you're working on
   b. Read relevant specs and design sections
   c. Implement the change in the codebase
   d. Mark task complete (`- [x]`) in tasks file
   e. Brief progress: what was done, files changed

4. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

## Output

- Change name
- Tasks completed
- Files modified/created
- Prompt: "All tasks complete! Run `/project:openspec-verify` to check or `/project:openspec-archive` to finalize."

## Guardrails
- Always read specs and design before implementing
- ONE task at a time, mark complete before next
- Follow design decisions from artifacts
- If task is unclear, ask user
- Do not skip tasks or implement out of order
- If something conflicts with specs, flag it
- `context` and `rules` from instructions are constraints for YOU, not file content
