## ADDED Requirements

### Requirement: Pyramid context draws on any source
A pyramid setup SHALL accept context sources of three kinds: items of any knowledge app of the same workspace, context packs of the same workspace, and files uploaded to that pyramid. Items and packs MUST be expanded along links by their depth. The brief MUST receive the free-text context plus every resolved source.

#### Scenario: Items, packs and files reach the brief
- **WHEN** a pyramid has an architecture item, a pack of a diagram with depth 1, and an uploaded file, and it runs
- **THEN** the brief prompt contains the file text, the architecture, the diagram and the product definition the diagram links to

#### Scenario: Foreign sources are refused
- **WHEN** a setup is saved with another workspace's item or pack, or another pyramid's file
- **THEN** the save fails with "Context item/pack/file not found"

### Requirement: Uploaded files are private to the pyramid
Files SHALL be added and removed only while the setup is editable, be at most 500,000 characters each and 100 per pyramid, be copied when the pyramid is duplicated and deleted with it, and be invisible to other users.

#### Scenario: Duplicate copies files
- **WHEN** a pyramid with a file is duplicated
- **THEN** the copy references its own copy of the file

### Requirement: Zip uploads
Uploading a `.zip` SHALL add every Markdown/text file inside it as a separate file and report anything skipped.

#### Scenario: Mixed upload
- **WHEN** the user uploads `notes.md`, a zip with `x/one.md`, and `paper.pdf`
- **THEN** two files are added and `paper.pdf` is reported as skipped

### Requirement: Context size limit
Estimating SHALL fail when the raw context exceeds the limit, naming its approximate token size.

#### Scenario: Too large
- **WHEN** a pyramid's sources total more than 600,000 characters
- **THEN** estimating fails with "The context is too large"

### Requirement: Legacy document ids and backups
Saving a setup SHALL fold legacy `contextDocumentIds` into `contextRefs`. Backups SHALL carry context refs and files and re-link them on import.

#### Scenario: Backup round trip
- **WHEN** a workspace whose pyramid uses an item, a pack and a file is exported and imported
- **THEN** the imported pyramid's refs point at the imported item, pack and file
