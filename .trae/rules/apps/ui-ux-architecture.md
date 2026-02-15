---
alwaysApply: false
category: "Product design & Management"
primaryColorClass: "bg-pink-600"
---
# UI/UX Architecture Rules

## Data Structure

The core data structure for this app is the `UiUxArchitecture` interface, defined in [src/types/uiUxArchitecture.ts](file:///home/pouria/projects/pyramid-solver/src/types/uiUxArchitecture.ts).

```typescript
export interface UiUxArchitecture {
  id: string; // Firebase ID
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  
  ui_ux_architecture_metadata: UiUxArchitectureMetadata;
  theme_specification: ThemeSpecification;
  base_components: BaseComponent[];
  pages: Page[];
  ux_patterns: UxPatterns;
}
```

## Logic & Rules

The core business logic is implemented in [src/services/uiUxArchitectureService.ts](file:///home/pouria/projects/pyramid-solver/src/services/uiUxArchitectureService.ts).

### Core Functions
- **Template Initialization**: `createUiUxArchitecture` initializes a structure with:
  - **Theme Specification**: Colors, typography, spacing, border radius.
  - **UX Patterns**: Loading states, error states, empty states.
  - Empty lists for `base_components` and `pages`.
- **Data Mapping**: `mapArchitectureFromStorage` converts storage timestamps (Firestore `Timestamp` or string) to ISO strings.

### Invariants
- Timestamps (`createdAt`, `updatedAt`) are always returned as ISO strings.
