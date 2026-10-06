## ADDED Requirements

### Requirement: Users can link two items of the same workspace
The system SHALL store explicit, directed, typed links between two knowledge items of the same workspace. The kind MUST be one of `references`, `depends-on`, `implements`, `derived-from`, `related`. Creating a link MUST require ownership of the workspace and that both items exist in it.

#### Scenario: Create a link
- **WHEN** the owner links technical architecture A to product definition P with kind `implements`
- **THEN** the link is stored and appears as outgoing on A and as incoming (backlink) on P

#### Scenario: Cross-workspace link is refused
- **WHEN** a user tries to link an item to an item of another workspace
- **THEN** the mutation fails with a "not found" error and nothing is stored

#### Scenario: Another user is denied
- **WHEN** a user who does not own the workspace calls create, remove or listForItem
- **THEN** create and remove throw, and listForItem returns empty lists

#### Scenario: Self-link and duplicate refused
- **WHEN** a user links an item to itself, or creates a link identical (from, to, kind) to an existing one
- **THEN** the mutation fails with a validation error

### Requirement: Links and backlinks are listed per item
The system SHALL list, for one item, its outgoing and incoming links with the other end's app and title, including derived links marked as automatic. Links whose other end no longer exists MUST NOT be listed.

#### Scenario: Derived link shown
- **WHEN** listing links for a technical architecture that a task depends on
- **THEN** the incoming list contains that task with `source: 'derived'`

### Requirement: Links follow item lifecycle
Deleting an item SHALL delete every link from or to it. Deleting a workspace SHALL delete its links. The workspace JSON backup SHALL include links, and importing a backup SHALL recreate them between the imported items (links whose ends cannot be mapped are dropped). Backups without links MUST still import.

#### Scenario: Delete cleans up
- **WHEN** a diagram that has links in both directions is deleted
- **THEN** no link references the diagram's id anymore

#### Scenario: Backup round trip
- **WHEN** a workspace with a link from a diagram to a product definition is exported and imported
- **THEN** the new workspace has a link of the same kind between the imported diagram and product definition

### Requirement: Links panel on every item editor
Every item editor SHALL offer a Links panel that shows outgoing links and backlinks, lets the user add a link (kind + target item picked from the workspace) and remove explicit links. Derived links MUST be shown but not removable.

#### Scenario: Add from the panel
- **WHEN** the user opens Links on a diagram, picks kind `references` and a context document, and confirms
- **THEN** the link appears in the outgoing list without a reload
