## ADDED Requirements

### Requirement: Export workspace button
The workspace header button that downloads the JSON backup SHALL be labelled "Export workspace".

#### Scenario: Label
- **WHEN** a workspace is open
- **THEN** the header shows an "Export workspace" button that downloads the JSON backup as before

### Requirement: Export knowledge entry in the sidebar
The workspace sidebar footer SHALL show an "Export knowledge" button directly above Settings that opens `/:workspaceId/export-knowledge` and is highlighted while that page is open.

#### Scenario: Navigate
- **WHEN** the user clicks "Export knowledge"
- **THEN** the Export knowledge page of the current workspace opens
