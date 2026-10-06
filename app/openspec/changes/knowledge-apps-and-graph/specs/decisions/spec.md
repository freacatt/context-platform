## ADDED Requirements

### Requirement: Decision records
The owner SHALL record decisions with status, date, context, options (pros/cons), decision, consequences and follow-ups, exported as an ADR in Markdown.

#### Scenario: Export
- **WHEN** an accepted decision dated 2026-10-07 is exported
- **THEN** the Markdown starts with its title and "**Status:** Accepted · **Date:** 2026-10-07"

### Requirement: Decision from a pyramid
A completed pyramid SHALL offer "Save as decision", creating a proposed decision from its final answer, linked derived-from the pyramid. A pyramid without a final answer MUST be refused.

#### Scenario: Save
- **WHEN** the user saves a completed pyramid's answer "Enter Germany first" as a decision
- **THEN** a proposed decision with that text exists and links to the pyramid
