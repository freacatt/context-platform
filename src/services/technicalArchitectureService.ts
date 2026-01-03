import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { TechnicalArchitecture } from '../types';

const TABLE_NAME = 'technicalArchitectures';

// Helper to map DB snake_case to JS camelCase
const mapArchitectureFromDB = (data: any, id: string): TechnicalArchitecture | null => {
    if (!data) return null;
    return {
        id: id,
        userId: data.userId || data.user_id,
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
export const createTechnicalArchitecture = async (userId: string, title: string = "New Technical Architecture"): Promise<string | null> => {
  if (!userId) return null;

  const defaultArchitecture: Omit<TechnicalArchitecture, 'id'> = {
    userId: userId,
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
    const docRef = await addDoc(collection(db, TABLE_NAME), {
        ...defaultArchitecture,
        createdAt: defaultArchitecture.createdAt?.toISOString(),
        lastModified: defaultArchitecture.lastModified?.toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error creating technical architecture: ", e);
    return null;
  }
};

/**
 * Get all technical architectures for a user
 */
export const getUserTechnicalArchitectures = async (userId: string): Promise<TechnicalArchitecture[]> => {
    try {
        const q = query(collection(db, TABLE_NAME), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const results: TechnicalArchitecture[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const architecture = mapArchitectureFromDB(data, doc.id);
            if (architecture) {
                results.push(architecture);
            }
        });
        
        // Sort by last modified descending
        return results.sort((a, b) => {
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
        const docRef = doc(db, TABLE_NAME, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return mapArchitectureFromDB(docSnap.data(), docSnap.id);
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error fetching technical architecture: ", e);
        return null;
    }
};

/**
 * Update a technical architecture
 */
export const updateTechnicalArchitecture = async (id: string, updates: Partial<TechnicalArchitecture>): Promise<boolean> => {
    try {
        const docRef = doc(db, TABLE_NAME, id);
        
        // Convert dates to strings for Firestore
        const dataToUpdate: any = { ...updates };
        if (dataToUpdate.createdAt) delete dataToUpdate.createdAt; // Don't update creation date
        
        dataToUpdate.lastModified = new Date().toISOString();
        
        await updateDoc(docRef, dataToUpdate);
        return true;
    } catch (e) {
        console.error("Error updating technical architecture: ", e);
        return false;
    }
};

/**
 * Delete a technical architecture
 */
export const deleteTechnicalArchitecture = async (id: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, TABLE_NAME, id));
        return true;
    } catch (e) {
        console.error("Error deleting technical architecture: ", e);
        return false;
    }
};
