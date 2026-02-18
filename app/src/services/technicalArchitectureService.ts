import { storage } from './storage';
import { TechnicalArchitecture } from '../types';

const TABLE_NAME = 'technicalArchitectures';

// Helper to map DB snake_case to JS camelCase
const mapArchitectureFromStorage = (data: any): TechnicalArchitecture | null => {
    if (!data) return null;
    return {
        id: data.id,
        userId: data.userId || data.user_id,
        workspaceId: data.workspaceId,
        title: data.title,
        createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
        lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null,
        metadata: data.metadata,
        system_architecture: data.system_architecture,
        technology_stack: data.technology_stack,
        code_organization: data.code_organization,
        design_patterns: data.design_patterns,
        api_standards: data.api_standards,
        security_standards: data.security_standards,
        performance_standards: data.performance_standards,
        testing_standards: data.testing_standards,
        deployment_cicd: data.deployment_cicd,
        preservation_rules: data.preservation_rules,
        ai_development_instructions: data.ai_development_instructions
    };
};

/**
 * Create a new technical architecture with the default template
 */
export const createTechnicalArchitecture = async (userId: string, title: string = "New Technical Architecture", workspaceId?: string): Promise<string | null> => {
  if (!userId) return null;

  const defaultArchitecture: Omit<TechnicalArchitecture, 'id'> = {
    userId: userId,
    workspaceId: workspaceId || undefined,
    title,
    createdAt: new Date(),
    lastModified: new Date(),
    metadata: {
      document_id: "",
      last_updated: new Date().toISOString().split('T')[0],
      description: ""
    },
    system_architecture: {
      main: {
        architecture_type: "",
        layers: [],
        core_principles: [],
        data_flow: ""
      },
      advanced: {
        layer_details: {}
      }
    },
    technology_stack: {
      main: {
        frontend: {
          framework: "",
          language: "",
          state: "",
          styling: "",
          http: ""
        },
        backend: {
          runtime: "",
          framework: "",
          language: "",
          database: "",
          orm: "",
          cache: ""
        },
        testing: {
          unit: "",
          component: "",
          e2e: ""
        }
      },
      advanced: {
        frontend_extras: {},
        backend_extras: {},
        devops: {}
      }
    },
    code_organization: {
      main: {
        directory_structure: {},
        naming_conventions: {}
      },
      advanced: {
        file_naming: {},
        file_size_limits: {},
        import_order: []
      }
    },
    design_patterns: {
      main: {
        mandatory_patterns: []
      },
      advanced: {
        frontend_patterns: {},
        anti_patterns_to_avoid: []
      }
    },
    api_standards: {
      main: {
        url_format: "",
        versioning: "",
        resource_naming: "",
        http_methods: {},
        status_codes: {}
      },
      advanced: {
        response_format: {
          success: {
            data: {},
            meta: {}
          },
          error: {
            error: {
              code: "",
              message: "",
              details: []
            }
          }
        },
        query_parameters: {},
        authentication: "",
        rate_limiting: ""
      }
    },
    security_standards: {
      main: {
        authentication: {},
        authorization: {
          model: "",
          roles: []
        },
        input_validation: {},
        data_protection: {}
      },
      advanced: {
        vulnerability_prevention: {},
        security_headers: {
          use: "",
          required: []
        },
        secrets_management: {}
      }
    },
    performance_standards: {
      main: {
        frontend_metrics: {},
        backend_targets: {},
        optimization_rules: []
      },
      advanced: {
        frontend_optimization: {},
        backend_optimization: {
          database: [],
          caching_ttl: {},
          compression: ""
        }
      }
    },
    testing_standards: {
      main: {
        coverage_requirements: {},
        test_pyramid: {},
        frameworks: {}
      },
      advanced: {
        unit_testing: {},
        component_testing: {
          philosophy: "",
          prefer_queries: [],
          user_events: ""
        },
        e2e_critical_flows: []
      }
    },
    deployment_cicd: {
      main: {
        environments: {},
        git_workflow: {
          branching: "",
          branches: [],
          commit_format: ""
        },
        ci_pipeline: []
      },
      advanced: {
        cd_pipeline: {},
        deployment_strategies: {},
        rollback: ""
      }
    },
    preservation_rules: {
      main: {
        core_principles: [],
        api_contracts: [],
        database_schema: []
      },
      advanced: {
        code_modification: {
          before_changing: [],
          while_changing: [],
          after_changing: []
        },
        versioning_strategy: {}
      }
    },
    ai_development_instructions: {
      main: {
        context_awareness: [],
        task_requirements: [],
        code_generation: []
      },
      advanced: {
        quality_gates: [],
        validation_before_deployment: []
      }
    }
  };

  try {
    const id = storage.createId();
    const newDoc = {
        ...defaultArchitecture,
        id,
        createdAt: defaultArchitecture.createdAt?.toISOString(),
        lastModified: defaultArchitecture.lastModified?.toISOString()
    };
    await storage.save(TABLE_NAME, newDoc);
    return id;
  } catch (e) {
    console.error("Error creating technical architecture: ", e);
    return null;
  }
};

/**
 * Get all technical architectures for a user
 */
export const getUserTechnicalArchitectures = async (userId: string, workspaceId?: string): Promise<TechnicalArchitecture[]> => {
    try {
        const filters: Record<string, any> = { userId };
        if (workspaceId) {
            filters.workspaceId = workspaceId;
        }
        
        const results = await storage.query(TABLE_NAME, filters);
        const architectures = results.map(mapArchitectureFromStorage).filter((x): x is TechnicalArchitecture => x !== null);
        
        // Sort by last modified descending
        return architectures.sort((a, b) => {
            const dateA = a.lastModified ? a.lastModified.getTime() : 0;
            const dateB = b.lastModified ? b.lastModified.getTime() : 0;
            return dateB - dateA;
        });
    } catch (e) {
        console.error("Error fetching user technical architectures: ", e);
        return [];
    }
};

/**
 * Get a single technical architecture by ID
 */
export const getTechnicalArchitecture = async (id: string): Promise<TechnicalArchitecture | null> => {
    try {
        const data = await storage.get(TABLE_NAME, id);

        if (data) {
            return mapArchitectureFromStorage(data);
        } else {
            return null;
        }
    } catch (e: any) {
        if (e?.code !== 'permission-denied' && !e?.message?.includes('Missing or insufficient permissions')) {
            console.error("Error fetching technical architecture: ", e);
        }
        return null;
    }
};

/**
 * Update a technical architecture
 */
export const updateTechnicalArchitecture = async (id: string, updates: Partial<TechnicalArchitecture>): Promise<boolean> => {
    try {
        await storage.update(TABLE_NAME, id, {
            ...updates,
            lastModified: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error("Error updating technical architecture: ", e);
        return false;
    }
};

/**
 * Rename a technical architecture
 */
export const renameTechnicalArchitecture = async (id: string, newTitle: string): Promise<boolean> => {
    try {
        await storage.update(TABLE_NAME, id, {
            title: newTitle,
            lastModified: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error("Error renaming technical architecture: ", e);
        return false;
    }
};

/**
 * Delete a technical architecture
 */
export const deleteTechnicalArchitecture = async (id: string): Promise<boolean> => {
    try {
        await storage.delete(TABLE_NAME, id);
        return true;
    } catch (e) {
        console.error("Error deleting technical architecture: ", e);
        return false;
    }
};
