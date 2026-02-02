export type TaskType = 'NEW_TASK' | 'FIX_TASK';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface TaskMetadata {
    task_id: string;
    task_type: TaskType;
    parent_architecture_ref: string;
    created_at: string; // ISO Date string
    priority: TaskPriority;
    status: TaskStatus;
    assigned_to: string;
    estimated_hours: number;
}

export interface Section<TMain, TAdvanced> {
    main: TMain;
    advanced: TAdvanced;
}

// Description Section
export interface DescriptionMain {
    title: string;
    summary?: string;
    bug_report?: string;
    impact?: string;
    affected_users?: string;
    steps_to_reproduce?: string[];
    expected_behavior?: string;
    actual_behavior?: string;
    acceptance_criteria?: string[];
}

export interface DescriptionAdvanced {
    detailed_requirements?: string;
    user_stories?: string[];
    business_value?: string;
    dependencies_on_other_tasks?: string[];
    related_tasks?: string[];
    error_messages?: string[];
    root_cause_analysis?: string;
    affected_versions?: string;
    reported_by?: string;
    frequency?: string;
    related_bugs?: string[];
}

// Components Section
export interface FileToCreate {
    file_path: string;
    file_type: string;
    purpose: string;
}

export interface FileToModify {
    file_path: string;
    reason: string;
    lines_affected: string;
    current_issue: string;
    proposed_fix: string;
}

export interface KeyFunction {
    name: string;
    signature: string;
    purpose: string;
}

export interface FunctionToFix {
    name: string;
    current_signature: string;
    issue: string;
    fix_approach: string;
}

export interface ComponentsMain {
    files_to_create?: FileToCreate[] | any;
    key_functions?: KeyFunction[] | any;
    files_to_modify?: FileToModify[] | any;
    functions_to_fix?: FunctionToFix[] | any;
}

export interface InterfaceDef {
    name: string;
    properties: Record<string, string>;
    location: string;
}

export interface RefactoringNeeded {
    area: string;
    reason: string;
    approach: string;
}

export interface ComponentsAdvanced {
    interfaces?: InterfaceDef[];
    exports?: string[];
    imports?: string[];
    new_components_if_needed?: string[];
    refactoring_needed?: RefactoringNeeded[];
    code_before?: string;
    code_after?: string;
}

// Architecture Section
export interface ArchitectureMain {
    design_pattern?: string;
    layer?: string;
    architecture_compliance?: {
        follows_parent_architecture: boolean;
        layer_responsibilities_respected?: boolean;
        depends_on_layers?: string[];
        maintains_service_layer_pattern?: boolean;
        no_architectural_changes?: boolean;
    };
    data_flow?: string[];
    impact_analysis?: {
        breaking_changes: boolean;
        affected_modules: string[];
        migration_required: boolean;
        backward_compatibility: string;
    };
}

export interface IntegrationPoint {
    system: string;
    interaction_type: string;
    endpoint?: string;
    slice?: string;
    description: string;
}

export interface ArchitectureAdvanced {
    integration_points?: IntegrationPoint[];
    scalability_considerations?: string;
    security_requirements?: string[];
    performance_requirements?: Record<string, string>;
    design_changes?: string;
    regression_risks?: string[];
    performance_impact?: string;
    security_impact?: string;
}

// Dependencies Section
export interface ExternalLibrary {
    name: string;
    version: string;
    purpose: string;
}

export interface InternalModule {
    module: string;
    imports: string[];
    purpose: string;
}

export interface DependenciesMain {
    external_libraries?: ExternalLibrary[] | any;
    internal_modules?: InternalModule[] | any;
    updated_libraries?: string[] | any;
    new_dependencies?: string[] | any;
    removed_dependencies?: string[] | any;
}

export interface EnvVariable {
    name: string;
    required: boolean;
    description: string;
    example: string;
}

export interface DependenciesAdvanced {
    environment_variables?: EnvVariable[];
    system_requirements?: Record<string, any>;
    peer_dependencies?: string[];
    dependency_changes?: string;
    version_compatibility?: string;
    potential_conflicts?: string;
}

// Unit Tests Section
export interface UnitTestsMain {
    test_framework: string;
    coverage_target: string;
    critical_tests: string[];
}

export interface TestToImplement {
    test_name: string;
    test_type: string;
    scenario: string;
    assertions: string[];
    mock_data: Record<string, any>;
}

export interface ExistingTestUpdate {
    test_file: string;
    test_name: string;
    reason: string;
    updates_needed: string[];
}

export interface NewTestToAdd {
    test_file: string;
    test_name: string;
    scenario: string;
    assertions: string[];
    mock_data: Record<string, any>;
}

export interface RegressionTest {
    test_name: string;
    scenarios: string[];
}

export interface UnitTestsAdvanced {
    test_files?: {
        file_path: string;
        tests_to_implement: TestToImplement[];
    }[];
    edge_cases?: string[];
    mocking_strategy?: Record<string, string>;
    existing_tests_to_update?: ExistingTestUpdate[];
    new_tests_to_add?: NewTestToAdd[];
    regression_tests?: RegressionTest[];
}

// Validation Checklist Section
export interface ValidationChecklistMain {
    before_implementation?: string[];
    during_implementation?: string[];
    after_implementation?: string[];
    bug_verification?: string[];
    testing?: string[];
    deployment?: string[];
}

export interface ValidationChecklistAdvanced {
    code_quality: string[];
    functionality?: string[];
    documentation: string[];
    security?: string[];
    performance?: string[];
}

// Preservation Rules Section
export interface ExistingFunctionality {
    feature: string;
    description: string;
    critical_paths: string[];
    validation?: string;
    tests_that_must_pass?: string[];
}

export interface NonBreakingRequirement {
    api_contracts?: {
        endpoint: string;
        current_response: string;
        rule: string;
    }[];
    function_signatures?: {
        function: string;
        location: string;
        rule: string;
        consumers: string[];
    }[];
    behavior?: string[];
}

export interface PreservationRulesMain {
    existing_functionality_to_preserve: ExistingFunctionality[];
    non_breaking_requirements: NonBreakingRequirement;
}

export interface IntegrationSafety {
    dependent_components?: {
        component: string;
        dependency: string;
        validation: string;
    }[];
    shared_state?: {
        state: string;
        rule: string;
        consumers: string[];
    }[];
    dependent_systems?: {
        system: string;
        dependency: string;
        must_not_break: string[];
        validation_method: string;
    }[];
}

export interface PreservationRulesAdvanced {
    integration_safety: IntegrationSafety;
    rollback_plan: string | {
        strategy: string;
        monitoring: string;
        triggers: string;
    };
}

// Combined Technical Task Interface
export interface TechnicalTaskData {
    task_metadata: TaskMetadata;
    description: Section<DescriptionMain, DescriptionAdvanced>;
    components: Section<ComponentsMain, ComponentsAdvanced>;
    architecture: Section<ArchitectureMain, ArchitectureAdvanced>;
    dependencies: Section<DependenciesMain, DependenciesAdvanced>;
    unit_tests: Section<UnitTestsMain, UnitTestsAdvanced>;
    validation_checklist: Section<ValidationChecklistMain, ValidationChecklistAdvanced>;
    preservation_rules: Section<PreservationRulesMain, PreservationRulesAdvanced>;
}

export interface Pipeline {
    id: string;
    userId: string;
    workspaceId?: string;
    title: string;
    order: number;
}

export interface TechnicalTask {
    id: string;
    pipelineId: string;
    userId: string;
    workspaceId?: string;
    title: string;
    type: TaskType;
    technicalArchitectureId: string; // Ref to specific technical architecture
    data: TechnicalTaskData;
    createdAt: Date;
    updatedAt: Date;
    order: number;
}
