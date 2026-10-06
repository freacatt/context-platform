## ADDED Requirements

### Requirement: UI/UX architectures use a design system
A UI/UX architecture SHALL link at most one design system of the same workspace; pages choose components from it. The link is a derived knowledge relation. Deleting the design system MUST unlink it.

#### Scenario: Cross-workspace design system refused
- **WHEN** an architecture is set to another workspace's design system
- **THEN** the mutation fails with "Design system not found"

### Requirement: Legacy theme moves to a design system
An architecture of the previous version with a theme or components SHALL offer to move them into a new design system named "<title> design system", keeping component ids, then link it and clear the legacy fields.

#### Scenario: Move
- **WHEN** the user moves the theme of "Portal" with a primary color and a Button component
- **THEN** "Portal design system" exists with that color and component, and Portal uses it
