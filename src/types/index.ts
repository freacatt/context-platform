import { Block } from '../utils/pyramidLayout';

export type { Block };

export interface ContextSource {
  id: string;
  type: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask' | 'uiUxArchitecture' | 'directory' | 'diagram';
  title?: string;
}

export interface Pyramid {
  id: string;
  userId: string;
  title: string;
  context: string | null;
  createdAt: Date | null;
  lastModified: Date | null;
  status: string;
  blocks: Record<string, Block>;
  connections: any[];
  contextSources?: ContextSource[];
}

export interface QuestionGenerationData {
  historyContext?: string;
  parentQuestions?: string[];
  parentQuestion?: string;
  combinedQuestion?: string;
  currentAnswer?: string;
}

export type BlockType = 'regular' | 'combined';

export interface ProductDefinitionNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
  question?: string;
  parent?: string;
  children?: string[];
}

export interface ProductDefinition {
  id: string;
  userId: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  linkedPyramidId: string | null;
  contextSources: ContextSource[];
  data: Record<string, ProductDefinitionNode>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StoredMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | null;
  metadata: Record<string, any>;
  parentId: string;
  parentCollection: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ContextDocument {
  id: string;
  userId: string;
  title: string;
  type: string;
  content: string;
  notionId: string;
  createdAt: Date | null;
  lastModified: Date | null;
  directoryId?: string | null;
}

export interface Directory {
  id: string;
  userId: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
}

export interface UiUxArchitecture {
  id: string;
  userId: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  nodes: any[];
  edges: any[];
}

export interface DiagramNodeData {
  title: string;
  description: string;
  contextSources?: ContextSource[];
}

export interface Diagram {
  id: string;
  userId: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  nodes: any[]; // Using any[] to avoid strict dependency on reactflow types in generic types file, or could import
  edges: any[];
}
export interface TechnicalArchitecture {
  id: string;
  userId: string;
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
    advanced: {
      vulnerability_prevention: Record<string, string>;
      security_headers: { use: string; required: string[] };
      secrets_management: Record<string, string>;
    };
  };
  performance_standards: {
    main: {
      frontend_metrics: Record<string, string>;
      backend_targets: Record<string, string>;
      optimization_rules: string[];
    };
    advanced: {
      frontend_optimization: Record<string, string>;
      backend_optimization: {
        database: string[];
        caching_ttl: Record<string, string>;
        compression: string;
      };
    };
  };
  testing_standards: {
    main: {
      coverage_requirements: Record<string, string>;
      test_pyramid: Record<string, string>;
      frameworks: Record<string, string>;
    };
    advanced: {
      unit_testing: Record<string, string>;
      component_testing: {
        philosophy: string;
        prefer_queries: string[];
        user_events: string;
      };
      e2e_critical_flows: string[];
    };
  };
  deployment_cicd: {
    main: {
      environments: Record<string, string>;
      git_workflow: {
        branching: string;
        branches: string[];
        commit_format: string;
      };
      ci_pipeline: string[];
    };
    advanced: {
      cd_pipeline: Record<string, string>;
      deployment_strategies: Record<string, string>;
      rollback: string;
    };
  };
  preservation_rules: {
    main: {
      core_principles: string[];
      api_contracts: string[];
      database_schema: string[];
    };
    advanced: {
      code_modification: {
        before_changing: string[];
        while_changing: string[];
        after_changing: string[];
      };
      versioning_strategy: Record<string, string>;
    };
  };
  ai_development_instructions: {
    main: {
      context_awareness: string[];
      task_requirements: string[];
      code_generation: string[];
    };
    advanced: {
      quality_gates: string[];
      validation_before_deployment: string[];
    };
  };
}
