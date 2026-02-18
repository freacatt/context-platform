alwaysApply: false
applyMode: intelligence
category: "Technical"
primaryColorClass: "bg-purple-600"
---
# Technical Architecture Rules

## Data Structure

The core data structure for this app is the `TechnicalArchitecture` interface, defined in [app/src/types/technicalArchitecture.ts](file:///home/pouria/projects/pyramid-solver/app/src/types/technicalArchitecture.ts).

```typescript
export interface TechnicalArchitecture {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  metadata: {
    document_id: string;
    last_updated: string;
    description: string;
  };
  system_architecture: {
    main: {
      architecture_type: string;
      layers: string[];
      core_principles: string[];
      data_flow: string;
    };
    advanced: {
      layer_details: Record<string, { technologies: string[]; depends_on: string | null }>;
    };
  };
  technology_stack: {
    main: {
      frontend: {
        framework: string;
        language: string;
        state: string;
        styling: string;
        http: string;
      };
      backend: {
        runtime: string;
        framework: string;
        language: string;
        database: string;
        orm: string;
        cache: string;
      };
      testing: {
        unit: string;
        component: string;
        e2e: string;
      };
    };
    advanced: {
      frontend_extras: Record<string, string>;
      backend_extras: Record<string, string>;
      devops: Record<string, string>;
    };
  };
  code_organization: {
    main: {
      directory_structure: Record<string, string>;
      naming_conventions: Record<string, string>;
    };
    advanced: {
      file_naming: Record<string, string>;
      file_size_limits: Record<string, string>;
      import_order: string[];
    };
  };
  design_patterns: {
    main: {
      mandatory_patterns: Array<{
        name: string;
        layer?: string;
        rule: string;
      }>;
    };
    advanced: {
      frontend_patterns: Record<string, string>;
      anti_patterns_to_avoid: string[];
    };
  };
  api_standards: {
    main: {
      url_format: string;
      versioning: string;
      resource_naming: string;
      http_methods: Record<string, string>;
      status_codes: Record<string, string>;
    };
    advanced: {
      response_format: {
        success: { data: any; meta: any };
        error: { error: { code: string; message: string; details: any[] } };
      };
      query_parameters: Record<string, string>;
      authentication: string;
      rate_limiting: string;
    };
  };
  security_standards: {
    main: {
      authentication: Record<string, string | number>;
      authorization: { model: string; roles: string[] };
      input_validation: Record<string, string>;
      data_protection: Record<string, string | string[]>;
    };
    // ...
  };
}
```

## Logic & Rules

The core business logic is implemented in [app/src/services/technicalArchitectureService.ts](file:///home/pouria/projects/pyramid-solver/app/src/services/technicalArchitectureService.ts).

### Core Functions
- **Template Initialization**: `createTechnicalArchitecture` initializes a comprehensive schema with empty placeholders for all major architectural sections:
  - System Architecture
  - Technology Stack
  - Code Organization
  - Design Patterns
  - API Standards
  - Security Standards
- **Data Mapping**: `mapArchitectureFromStorage` handles the conversion from storage format to the TypeScript interface.

### Invariants
- New architectures are always initialized with the full, deep structure to ensure UI components don't crash on missing nested fields.
