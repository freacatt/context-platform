## ADDED Requirements

### Requirement: Structured product model
A product definition SHALL hold a vision, a problem, personas, jobs to be done, features with priority/status/personas/acceptance criteria, requirements, non-goals, metrics, assumptions and risks, normalized on every save.

#### Scenario: Normalized save
- **WHEN** a feature is saved with an unknown priority
- **THEN** it is stored with priority "should" and status "idea"

### Requirement: Previous version is read, not lost
A document of the previous mind-map version SHALL open with known topics mapped to fields and every answer kept in notes under its headings; saving it MUST drop the old data.

#### Scenario: Legacy document
- **WHEN** a legacy definition with "Product Summary" = "A thinking tool" and "Current Pain" = "Docs are scattered" is opened
- **THEN** the vision is "A thinking tool", the problem is "Docs are scattered", and the notes contain both answers
