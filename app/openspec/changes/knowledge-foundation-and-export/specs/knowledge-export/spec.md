## ADDED Requirements

### Requirement: Export knowledge page selects items
The system SHALL provide a page at `/:workspaceId/export-knowledge` listing every knowledge item grouped by app, with a checkbox per item and a select-all per app.

#### Scenario: Select an app
- **WHEN** the user ticks select-all on "Diagrams"
- **THEN** every diagram is selected and the summary count increases accordingly

### Requirement: Linked items can be included
The user SHALL choose a link depth (none, 1, 2, all). The export MUST contain the selected items plus every item reachable from them through explicit or derived links (in either direction) within that depth, each item once.

#### Scenario: Depth 1
- **WHEN** a task is selected, depth is 1, and the task depends on architecture A which implements product definition P
- **THEN** the export contains the task and A, but not P

#### Scenario: Depth all
- **WHEN** the same selection is exported with depth "all"
- **THEN** the export contains the task, A and P

### Requirement: Zip export
Choosing zip SHALL download `<workspace>_knowledge.zip` containing one `<app-folder>/<slug>.md` per item, `INDEX.md` and `graph.json`. Each item file MUST start with YAML frontmatter (`id`, `app`, `title`, `updated`, metadata, `links`) and end with "Links" and "Backlinks" sections using `[[path|Title]]` wiki-links. Slugs MUST be unique within the zip.

#### Scenario: Two items with the same title
- **WHEN** two diagrams are both titled "Flow"
- **THEN** the zip contains `diagrams/flow.md` and `diagrams/flow-2.md`

#### Scenario: Relations in INDEX and graph
- **WHEN** the export contains a link from A to P
- **THEN** `INDEX.md` has a relations row for it and `graph.json` has an edge `{ from, to, kind, source }` for it

#### Scenario: Links to items outside the export
- **WHEN** an exported item links to an item that is not in the export
- **THEN** that link is omitted from the item's Links section, INDEX.md and graph.json

### Requirement: Single Markdown export
Choosing single file SHALL download `<workspace>_knowledge.md` with a contents list, every item under a stable anchor with headings demoted one level (outside fenced code blocks), links rendered as in-document anchor links, and a final relations table.

#### Scenario: Headings demoted
- **WHEN** an item body contains `# Title` and `## Section` and a fenced block containing `# comment`
- **THEN** the single file contains `## Title` and `### Section`, and the fenced `# comment` is unchanged

### Requirement: Size estimate before download
The page SHALL show, for the current selection and options, the number of items after link expansion, the output size and an approximate token count, and MUST disable Download when nothing is selected.

#### Scenario: Empty selection
- **WHEN** nothing is selected
- **THEN** Download is disabled and the summary shows 0 items

### Requirement: Collection is server-side and workspace-scoped
Collecting items for export SHALL happen in one Convex query that only reads items of the requested workspace owned by the caller; foreign or unknown refs MUST be skipped, and a non-owner MUST get no items.

#### Scenario: Another user
- **WHEN** a user calls collect for a workspace they do not own
- **THEN** the result is `null` (no items)
