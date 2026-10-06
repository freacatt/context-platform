## ADDED Requirements

### Requirement: Technical plans
The workspace owner SHALL create technical plans with a status, goal, context, scope, approach, phases of checkable steps, decisions, risks, open questions, acceptance criteria, test strategy and rollout. The plan's progress MUST be the share of non-empty steps done. Its inputs SHALL be its outgoing links.

#### Scenario: Progress
- **WHEN** a plan has steps "Add endpoint" (done) and "Add tests"
- **THEN** it shows 1/2 steps done, and its Markdown export has `- [x] Add endpoint` and `- [ ] Add tests`

### Requirement: Legacy tasks convert into plans
While legacy technical tasks exist, the plans page SHALL offer to convert them. Converting MUST create one plan per task, link it to the task's architecture, repoint links, context packs and pyramid context refs from each task to its plan, and delete the tasks and pipelines.

#### Scenario: Conversion keeps relations
- **WHEN** a task linked from a diagram, in a pack, used by a pyramid and attached to an architecture is converted
- **THEN** the plan has the diagram backlink, the pack and the pyramid reference the plan, and the plan depends on the architecture

### Requirement: Legacy tasks in backups
Importing a backup that contains technical tasks SHALL create technical plans from them.

#### Scenario: Import
- **WHEN** a backup with one task attached to an architecture is imported
- **THEN** the new workspace has a plan with that title depending on the imported architecture
