# OpenSpec: Sync Specs

Sync delta specs from a change to main specs. This is an agent-driven operation — read delta specs and directly edit main specs with intelligent merging.

**Input**: $ARGUMENTS (optional change name)

## Steps

1. **If no change name provided, prompt for selection**

   Run `openspec list --json`. Let user select. Show changes that have delta specs.

   Do NOT guess or auto-select.

2. **Find delta specs**

   Look for files at `openspec/changes/<name>/specs/*/spec.md`.

   Delta specs contain sections:
   - `## ADDED Requirements` — new requirements
   - `## MODIFIED Requirements` — changes to existing
   - `## REMOVED Requirements` — requirements to remove
   - `## RENAMED Requirements` — FROM:/TO: format

   If no delta specs found, inform and stop.

3. **For each delta spec, apply to main specs**

   For each capability at `openspec/changes/<name>/specs/<capability>/spec.md`:

   a. Read the delta spec
   b. Read main spec at `openspec/specs/<capability>/spec.md` (may not exist)
   c. Apply changes:
      - **ADDED**: Add if not exists, update if exists
      - **MODIFIED**: Find in main, apply partial changes, preserve unmentioned content
      - **REMOVED**: Remove entire requirement block
      - **RENAMED**: Find FROM, rename to TO
   d. Create new main spec if capability doesn't exist yet

4. **Show summary**

   ```
   ## Specs Synced: <change-name>

   **<capability-1>**:
   - Added requirement: "Feature X"
   - Modified requirement: "Feature Y" (added 1 scenario)
   ```

## Key Principle: Intelligent Merging

Unlike programmatic merging, apply **partial updates**:
- Add a scenario without copying existing ones
- Delta represents *intent*, not wholesale replacement
- Preserve existing content not mentioned in delta
- Operation should be idempotent

## Guardrails
- Read both delta and main specs before changes
- Preserve existing content not mentioned in delta
- If unclear, ask for clarification
- Show what you're changing as you go
