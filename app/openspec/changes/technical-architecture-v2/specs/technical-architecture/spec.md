## ADDED Requirements

### Requirement: Architecture model
A technical architecture SHALL describe overview, components with typed kinds and dependencies, key flows, stack, data entities, interfaces, cross-cutting concerns, delivery, rules for changes and risks, normalized on every save.

#### Scenario: Normalized save
- **WHEN** a component is saved with an unknown kind
- **THEN** it is stored as a "service" with no dependencies

### Requirement: Component diagram
The editor SHALL draw components left to right by dependency depth with labelled edges; clicking a component opens its details.

#### Scenario: Callers left of dependencies
- **WHEN** a web app depends on an API that depends on a database
- **THEN** the web app is in column 0, the API in column 1 and the database in column 2

### Requirement: Exports
The architecture SHALL export as Markdown with a Mermaid component diagram and as AGENTS.md containing the system, stack, conventions and rules.

#### Scenario: AGENTS.md
- **WHEN** an architecture with a "Never: Query the database from the web app" rule is exported as AGENTS.md
- **THEN** the file has a "## Never" section with that rule

### Requirement: Templates
An architecture with no content SHALL offer templates that fill it with a common shape.

#### Scenario: Apply
- **WHEN** the user picks "Event-driven services" on an empty architecture
- **THEN** its summary, components and principles are filled and the templates disappear

### Requirement: Previous version is read, not lost
A previous fixed-section architecture SHALL open as the new model with its content mapped (layers to components, stack, standards to concerns, rules); saving it MUST clear the old sections.

#### Scenario: Legacy
- **WHEN** a legacy architecture with layers UI → API and "Never break the API" is opened
- **THEN** it has components UI (depending on API) and API, and "Never break the API" under Always
