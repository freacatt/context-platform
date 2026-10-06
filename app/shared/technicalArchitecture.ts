import type { TechnicalArchitectureSpec } from './types/technicalArchitecture';

/**
 * Full, empty technical architecture. Every section is present with placeholder
 * values so editors never have to guard against missing structure.
 */
export const createDefaultTechnicalArchitecture = (
  now: Date = new Date(),
): TechnicalArchitectureSpec => {
  const today = now.toISOString().split('T')[0];
  return {
    metadata: {
      document_id: '',
      last_updated: today,
      description: ''
    },
    system_architecture: {
      main: {
        architecture_type: '',
        layers: [],
        core_principles: [],
        data_flow: ''
      },
      advanced: {
        layer_details: {}
      }
    },
    technology_stack: {
      main: {
        frontend: {
          framework: '',
          language: '',
          state: '',
          styling: '',
          http: ''
        },
        backend: {
          runtime: '',
          framework: '',
          language: '',
          database: '',
          orm: '',
          cache: ''
        },
        testing: {
          unit: '',
          component: '',
          e2e: ''
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
        url_format: '',
        versioning: '',
        resource_naming: '',
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
              code: '',
              message: '',
              details: []
            }
          }
        },
        query_parameters: {},
        authentication: '',
        rate_limiting: ''
      }
    },
    security_standards: {
      main: {
        authentication: {},
        authorization: {
          model: '',
          roles: []
        },
        input_validation: {},
        data_protection: {}
      },
      advanced: {
        vulnerability_prevention: {},
        security_headers: {
          use: '',
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
          compression: ''
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
          philosophy: '',
          prefer_queries: [],
          user_events: ''
        },
        e2e_critical_flows: []
      }
    },
    deployment_cicd: {
      main: {
        environments: {},
        git_workflow: {
          branching: '',
          branches: [],
          commit_format: ''
        },
        ci_pipeline: []
      },
      advanced: {
        cd_pipeline: {},
        deployment_strategies: {},
        rollback: ''
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
};
