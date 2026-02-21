# OpenSpec: Continue Change

Continue working on a change by creating the next artifact.

**Input**: $ARGUMENTS (optional change name)

## Steps

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes sorted by most recently modified. Let the user select which change to work on.

   Show top 3-4 most recently modified changes with: name, schema, status, last modified.

   Do NOT guess or auto-select. Always let the user choose.

2. **Check current status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse JSON for `schemaName`, `artifacts` (with status), `isComplete`.

3. **Act based on status**:

   **If all artifacts complete (`isComplete: true`)**:
   - Congratulate the user
   - Show final status
   - Suggest: "All artifacts created! You can now implement (`/project:openspec-apply`) or archive (`/project:openspec-archive`)."
   - STOP

   **If artifacts are ready** (status: "ready"):
   - Pick the FIRST artifact with `status: "ready"`
   - Get instructions:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - Parse JSON. Key fields: `context`, `rules` (constraints for you, NOT content), `template` (structure for output), `instruction`, `outputPath`, `dependencies`
   - Read dependency artifact files for context
   - Create the artifact file using `template` as structure
   - Apply `context` and `rules` as constraints — do NOT copy them into the file
   - Show what was created and what's unlocked
   - STOP after creating ONE artifact

   **If no artifacts ready (all blocked)**:
   - Show status and suggest checking for issues

4. **Show progress**
   ```bash
   openspec status --change "<name>"
   ```

## Output

- Which artifact was created
- Schema workflow being used
- Progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Want to continue? Ask me to continue or tell me what to do next."

## Artifact Patterns

**spec-driven schema** (proposal → specs → design → tasks):
- **proposal.md**: Why, What Changes, Capabilities, Impact. Capabilities section is critical — each needs a spec.
- **specs/<capability>/spec.md**: One spec per capability from proposal.
- **design.md**: Technical decisions, architecture, approach.
- **tasks.md**: Implementation checklist with checkboxes.

## Guardrails
- Create ONE artifact per invocation
- Always read dependency artifacts before creating
- Never skip or create out of order
- If unclear, ask user before creating
- `context` and `rules` are constraints for YOU, not content for the file
- Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into artifacts
