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
