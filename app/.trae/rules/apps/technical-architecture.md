---
alwaysApply: false
applyMode: intelligence
description: Rules for the Technical Architecture app.
globs:
  - "app/src/**/technicalArchitecture*"
  - "app/src/**/TechnicalArchitecture*"
category: "Technical"
primaryColorClass: "bg-purple-600"
---
# Technical Architecture Rules

## CRITICAL
- New architectures MUST be initialized with the full deep structure (all sections with empty placeholders) to prevent UI crashes on missing nested fields.

## Data Model
- Type: `TechnicalArchitecture` in `app/src/types/technicalArchitecture.ts` — deeply nested interface with sections: `system_architecture`, `technology_stack`, `code_organization`, `design_patterns`, `api_standards`, `security_standards` (each with `main` and `advanced` sub-objects).
- Service: `app/src/services/technicalArchitectureService.ts`

## Core Logic
- `createTechnicalArchitecture`: Initializes comprehensive schema with empty placeholders for all sections.
- `mapArchitectureFromStorage`: Converts storage format to TypeScript interface.
