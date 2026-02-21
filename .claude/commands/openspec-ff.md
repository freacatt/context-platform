# OpenSpec: Fast-Forward Change

Fast-forward through artifact creation — generate everything needed for implementation in one go.

**Input**: $ARGUMENTS (change name in kebab-case OR description of what to build)

## Steps

1. **If no clear input provided, ask what they want to build**

   Ask: "What change do you want to work on? Describe what you want to build or fix."

   Derive kebab-case name from description. Do NOT proceed without understanding intent.

2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```

3. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse: `applyRequires` (artifact IDs needed before implementation), `artifacts` (list with status/dependencies).

4. **Create artifacts in sequence until apply-ready**

   Loop through artifacts in dependency order:

   a. For each artifact with `status: "ready"`:
      - Get instructions: `openspec instructions <artifact-id> --change "<name>" --json`
      - Read dependency files for context
      - Create artifact using `template` as structure
      - Apply `context` and `rules` as constraints — do NOT copy into file
      - Show: "Created <artifact-id>"

   b. After each, re-check status. Stop when all `applyRequires` artifacts are `done`.

   c. If artifact needs user input, ask and continue.

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

## Output

- Change name and location
- Artifacts created with descriptions
- "All artifacts created! Ready for implementation."
- Prompt: "Run `/project:openspec-apply` or ask me to implement."

## Guardrails
- Create ALL artifacts needed (per schema's `apply.requires`)
- Always read dependencies before creating
- Prefer reasonable decisions to keep momentum; ask only if critically unclear
- If change name exists, suggest continuing instead
- Verify each artifact file after writing
- `context` and `rules` are constraints for you, NOT content for files
