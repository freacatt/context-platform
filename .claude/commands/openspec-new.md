# OpenSpec: Start New Change

Start a new change using the artifact-driven approach.

**Input**: $ARGUMENTS (change name in kebab-case OR description of what to build)

## Steps

1. **If no clear input provided, ask what they want to build**

   Ask the user:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   Do NOT proceed without understanding what the user wants to build.

2. **Determine the workflow schema**

   Use the default schema (omit `--schema`) unless the user explicitly requests a different workflow.

   Use a different schema only if the user mentions:
   - A specific schema name → use `--schema <name>`
   - "show workflows" or "what workflows" → run `openspec schemas --json` and let them choose

3. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   Add `--schema <name>` only if the user requested a specific workflow.

4. **Show the artifact status**
   ```bash
   openspec status --change "<name>"
   ```

5. **Get instructions for the first artifact**

   Check the status output to find the first artifact with status "ready".
   ```bash
   openspec instructions <first-artifact-id> --change "<name>"
   ```

6. **STOP and wait for user direction**

## Output

Summarize:
- Change name and location
- Schema/workflow and its artifact sequence
- Current status (0/N artifacts complete)
- Template for the first artifact
- Prompt: "Ready to create the first artifact? Describe what this change is about and I'll draft it, or ask me to continue."

## Guardrails
- Do NOT create any artifacts yet — just show instructions
- Do NOT advance beyond the first artifact template
- If name is invalid (not kebab-case), ask for a valid name
- If a change with that name exists, suggest continuing it instead
