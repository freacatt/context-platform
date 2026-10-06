## Decisions

- Same pattern as Product Definition: `spec` beside optional legacy fields, `technicalArchitectureSpecOf` on read, legacy cleared on update — no migration step.
- Diagram layout is deterministic: a component's column is one right of its deepest caller (`componentLevels`, cycles cut), so the picture is stable and needs no layout library.
- Free-text concerns rather than key/value maps: real architectures differ too much for fixed fields; placeholders carry the prompts.
- AGENTS.md contains only what an agent acts on (system, stack, principles, organization, conventions, security, testing, rules) — no history or rationale.
