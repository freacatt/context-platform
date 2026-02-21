---
name: openspec-apply-change
description: Implement a change by working through its tasks. Use when the user wants to apply/implement a change that has completed artifacts (specs, design, tasks).
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.1.1"
---

Apply a change by implementing its tasks using the specs and design as guidance.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select which change to implement.

   Show only changes that have tasks ready (not already archived).

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Load change context**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   Parse the JSON to get:
   - `specs`: Completed spec artifacts to reference during implementation
   - `design`: Technical design decisions to follow
   - `tasks`: Implementation checklist with task items

   Read all referenced artifact files for full context.

3. **Work through tasks sequentially**

   For each incomplete task (`- [ ]`) in the tasks file:

   a. Announce which task you are working on
   b. Read relevant specs and design sections for context
   c. Implement the change in the codebase
   d. Mark the task as complete (`- [x]`) in the tasks file
   e. Show brief progress: what was done and what files were changed

4. **After completing all tasks, show final status**

   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing implementation, summarize:
- Change name
- List of tasks completed
- Files modified/created
- Prompt: "All tasks complete! Run `/opsx:verify` to check implementation or `/opsx:archive` to finalize."

**Guardrails**
- Always read specs and design before implementing
- Implement ONE task at a time, marking it complete before moving to the next
- Follow the design decisions documented in the change artifacts
- If a task is unclear, ask the user before implementing
- Do not skip tasks or implement out of order
- Keep implementation aligned with the specs — if something conflicts, flag it
- **IMPORTANT**: `context` and `rules` from instructions are constraints for YOU, not content for files
