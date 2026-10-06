## ADDED Requirements

### Requirement: Save a selection as a Context Pack
The system SHALL let the workspace owner save the current export selection (item refs and link depth) under a non-empty name, and list, update, rename and delete packs of that workspace.

#### Scenario: Save and reload
- **WHEN** the user selects three items with depth 1 and saves them as "Checkout context"
- **THEN** the pack appears in the pack list, and loading it later restores the three items and depth 1

#### Scenario: Empty name refused
- **WHEN** the user saves a pack with a blank name
- **THEN** the mutation fails with "Title is required"

#### Scenario: Another user is denied
- **WHEN** a non-owner lists or modifies a pack
- **THEN** list returns an empty array and mutations throw

### Requirement: Packs tolerate deleted items
Loading a pack SHALL ignore refs to items that no longer exist.

#### Scenario: Item deleted after saving
- **WHEN** a pack contains a diagram that was deleted afterwards
- **THEN** loading the pack selects the remaining items and no error is shown
