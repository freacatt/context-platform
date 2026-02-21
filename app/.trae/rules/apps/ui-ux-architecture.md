---
alwaysApply: false
applyMode: intelligence
description: Rules for the UI/UX Architecture app.
globs:
  - "app/src/**/uiUxArchitecture*"
  - "app/src/**/UiUxArchitecture*"
category: "Product Design & Management"
primaryColorClass: "bg-pink-600"
---
# UI/UX Architecture Rules

## CRITICAL
- Timestamps (`createdAt`, `updatedAt`) MUST always be returned as ISO strings.

## Data Model
- Type: `UiUxArchitecture` in `app/src/types/uiUxArchitecture.ts` — contains `ui_ux_architecture_metadata`, `theme_specification`, `base_components`, `pages`, `ux_patterns`.
- Service: `app/src/services/uiUxArchitectureService.ts`

## Core Logic
- `createUiUxArchitecture`: Initializes with theme specification (colors, typography, spacing), UX patterns (loading/error/empty states), and empty component/page lists.
- `mapArchitectureFromStorage`: Converts Firestore `Timestamp` or string timestamps to ISO strings.
