## ADDED Requirements

### Requirement: Every workspace app item serializes to a knowledge item
The system SHALL turn every item of the knowledge apps (pyramids, product definitions, context documents, diagrams, technical architectures, UI/UX architectures, technical tasks) into a knowledge item with a ref (`app`, `id`), title, ISO update time, extra metadata and a Markdown body starting with `# <title>`. Serializers MUST be pure functions in `shared/knowledge/` usable from both Convex functions and the browser.

#### Scenario: Product definition serializes
- **WHEN** a product definition titled "Checkout" with filled topics is serialized
- **THEN** the item has ref `{ app: 'productDefinitions', id }`, title "Checkout", and a body starting with `# Checkout` containing every topic in tree order

#### Scenario: Context document uses plain text of rich content
- **WHEN** a context document whose content is Lexical JSON is serialized
- **THEN** the body contains the document's plain text, and metadata includes its type and its directory name when it is in a directory

#### Scenario: Pyramid serializes without costs or transcripts
- **WHEN** a completed pyramid is serialized
- **THEN** the body contains the question, the context text, the final answer, the critical path and each concluded cell, and does not contain cost tables or call transcripts

#### Scenario: Unfinished pyramid
- **WHEN** a pyramid that has not reached the final cell is serialized
- **THEN** the body states that the final answer is not reached yet and lists the cells concluded so far

### Requirement: Derived relations come from existing references
Serializers SHALL emit derived edges from references stored on the item itself: a technical task with a technical architecture yields a `depends-on` edge to it, and a pyramid yields a `references` edge to each of its context documents. Derived edges MUST NOT be stored.

#### Scenario: Task linked to architecture
- **WHEN** a technical task with `technicalArchitectureId` set is serialized
- **THEN** its derived edges contain `{ from: task, to: architecture, kind: 'depends-on', source: 'derived' }`

### Requirement: Single registry of knowledge apps
The system SHALL keep one registry listing each knowledge app's key, label and export folder, in dashboard order. Every key MUST match a workspace app key in `features/workspaces/apps.ts`.

#### Scenario: Registry matches workspace apps
- **WHEN** the registry test runs
- **THEN** the registry keys equal the workspace app keys

### Requirement: Existing per-item Markdown downloads keep working
Moving the Markdown builders to `shared/` SHALL NOT change the output of the existing per-item Markdown/Excel export buttons.

#### Scenario: Existing export tests still pass
- **WHEN** the existing export unit tests run after the move
- **THEN** they pass unchanged
