import React, { useState, useEffect, useMemo } from 'react';
import { TechnicalArchitecture } from '../../types';
import { updateTechnicalArchitecture } from '../../services/technicalArchitectureService';
import { Card, Grid, Heading, Flex, Text, Badge, Box } from '@radix-ui/themes';
import { CheckCircle, Circle } from 'lucide-react';
import FieldEditModal from './FieldEditModal';

interface EditorProps {
    architecture: TechnicalArchitecture;
    onSave?: () => void;
    readOnly?: boolean;
}

interface FieldDefinition {
    id: string;
    title: string;
    description?: string;
    path: string[];
    type: 'string' | 'list' | 'object' | 'map';
    category: string;
}

const ARCHITECTURE_FIELDS: FieldDefinition[] = [
    // System Architecture
    { id: 'sys_type', title: 'Architecture Type', description: 'e.g. Monolithic, Microservices', path: ['system_architecture', 'main', 'architecture_type'], type: 'string', category: 'System Architecture' },
    { id: 'sys_data_flow', title: 'Data Flow', description: 'Describe how data moves through the system', path: ['system_architecture', 'main', 'data_flow'], type: 'string', category: 'System Architecture' },
    { id: 'sys_layers', title: 'Layers', description: 'List the architectural layers', path: ['system_architecture', 'main', 'layers'], type: 'list', category: 'System Architecture' },
    { id: 'sys_principles', title: 'Core Principles', description: 'Key architectural principles', path: ['system_architecture', 'main', 'core_principles'], type: 'list', category: 'System Architecture' },
    
    // Tech Stack - Frontend
    { id: 'fe_framework', title: 'Frontend Framework', path: ['technology_stack', 'main', 'frontend', 'framework'], type: 'string', category: 'Technology Stack' },
    { id: 'fe_lang', title: 'Frontend Language', path: ['technology_stack', 'main', 'frontend', 'language'], type: 'string', category: 'Technology Stack' },
    { id: 'fe_state', title: 'State Management', path: ['technology_stack', 'main', 'frontend', 'state'], type: 'string', category: 'Technology Stack' },
    { id: 'fe_style', title: 'Styling Strategy', path: ['technology_stack', 'main', 'frontend', 'styling'], type: 'string', category: 'Technology Stack' },
    
    // Tech Stack - Backend
    { id: 'be_lang', title: 'Backend Language', path: ['technology_stack', 'main', 'backend', 'language'], type: 'string', category: 'Technology Stack' },
    { id: 'be_framework', title: 'Backend Framework', path: ['technology_stack', 'main', 'backend', 'framework'], type: 'string', category: 'Technology Stack' },
    { id: 'be_db', title: 'Database', path: ['technology_stack', 'main', 'backend', 'database'], type: 'string', category: 'Technology Stack' },
    { id: 'be_orm', title: 'ORM / Data Access', path: ['technology_stack', 'main', 'backend', 'orm'], type: 'string', category: 'Technology Stack' },
    
    // Code Organization
    { id: 'code_dirs', title: 'Directory Structure', description: 'Map paths to their purpose', path: ['code_organization', 'main', 'directory_structure'], type: 'map', category: 'Code Organization' },
    { id: 'code_naming', title: 'Naming Conventions', description: 'Rules for naming files, variables, etc.', path: ['code_organization', 'main', 'naming_conventions'], type: 'map', category: 'Code Organization' },
    
    // API Standards
    { id: 'api_url', title: 'URL Format', path: ['api_standards', 'main', 'url_format'], type: 'string', category: 'API Standards' },
    { id: 'api_methods', title: 'HTTP Methods', description: 'Usage of GET, POST, etc.', path: ['api_standards', 'main', 'http_methods'], type: 'map', category: 'API Standards' },
    { id: 'api_status', title: 'Status Codes', description: 'Standard status codes used', path: ['api_standards', 'main', 'status_codes'], type: 'map', category: 'API Standards' },
    
    // Security
    { id: 'sec_auth', title: 'Authentication', description: 'Auth mechanisms', path: ['security_standards', 'main', 'authentication'], type: 'map', category: 'Security Standards' },
    { id: 'sec_data', title: 'Data Protection', description: 'Encryption and handling', path: ['security_standards', 'main', 'data_protection'], type: 'map', category: 'Security Standards' },

    // Testing Standards
    { id: 'test_strategy', title: 'Testing Strategy', description: 'Test pyramid and approach', path: ['testing_standards', 'main', 'test_pyramid'], type: 'map', category: 'Testing Standards' },
    { id: 'test_coverage', title: 'Coverage Goals', description: 'Code coverage requirements', path: ['testing_standards', 'main', 'coverage_requirements'], type: 'map', category: 'Testing Standards' },
    { id: 'test_frameworks', title: 'Test Frameworks', description: 'Tools and libraries', path: ['testing_standards', 'main', 'frameworks'], type: 'map', category: 'Testing Standards' },
    { id: 'test_unit', title: 'Unit Testing', description: 'Guidelines for unit tests', path: ['testing_standards', 'advanced', 'unit_testing'], type: 'map', category: 'Testing Standards' },
    { id: 'test_e2e', title: 'Critical E2E Flows', description: 'Main user journeys to test', path: ['testing_standards', 'advanced', 'e2e_critical_flows'], type: 'list', category: 'Testing Standards' },

    // Deployment
    { id: 'dep_env', title: 'Environments', description: 'Dev, Staging, Prod details', path: ['deployment_cicd', 'main', 'environments'], type: 'map', category: 'Deployment & CI/CD' },
    { id: 'dep_ci', title: 'CI Pipeline', description: 'Steps in CI pipeline', path: ['deployment_cicd', 'main', 'ci_pipeline'], type: 'list', category: 'Deployment & CI/CD' },
    
    // AI Instructions
    { id: 'ai_context', title: 'AI Context Awareness', description: 'How AI should understand context', path: ['ai_development_instructions', 'main', 'context_awareness'], type: 'list', category: 'AI Instructions' },
    { id: 'ai_code', title: 'AI Code Generation', description: 'Rules for AI generated code', path: ['ai_development_instructions', 'main', 'code_generation'], type: 'list', category: 'AI Instructions' },
];

const getValueByPath = (obj: any, path: string[]) => {
    let current = obj;
    for (const key of path) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return current;
};

const isFieldFilled = (value: any): boolean => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return String(value).trim().length > 0;
};

export const TechnicalArchitectureEditor: React.FC<EditorProps> = ({ architecture: initialArchitecture, onSave, readOnly = false }) => {
    const [architecture, setArchitecture] = useState<TechnicalArchitecture>(initialArchitecture);
    const [isSaving, setIsSaving] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

    useEffect(() => {
        setArchitecture(initialArchitecture);
    }, [initialArchitecture]);

    const handleUpdate = async (path: string[], value: any) => {
        if (readOnly) return;

        const newArchitecture = { ...architecture };
        let current: any = newArchitecture;
        
        // Navigate to the parent of the target property
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        
        // Update value
        current[path[path.length - 1]] = value;
        
        setArchitecture(newArchitecture);
        
        setIsSaving(true);
        try {
            // Determine top-level section for update
            const section = path[0] as keyof TechnicalArchitecture;
            await updateTechnicalArchitecture(architecture.id, { [section]: newArchitecture[section] });
            if (onSave) onSave();
        } catch (e) {
            console.error("Failed to save", e);
        } finally {
            setIsSaving(false);
        }
    };

    const categories = useMemo(() => {
        const cats = Array.from(new Set(ARCHITECTURE_FIELDS.map(f => f.category)));
        return cats.map(cat => ({
            name: cat,
            fields: ARCHITECTURE_FIELDS.filter(f => f.category === cat)
        }));
    }, []);

    const activeField = useMemo(() => 
        ARCHITECTURE_FIELDS.find(f => f.id === editingFieldId), 
    [editingFieldId]);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <Flex justify="between" align="center" className="mb-8">
                <div>
                    <Heading size="6" className="text-gray-900">{architecture.title}</Heading>
                    <Text size="2" color="gray">
                        {architecture.metadata?.description || "Define your technical standards."}
                    </Text>
                </div>
                <Flex align="center" gap="2">
                    {isSaving && <Text size="2" color="gray">Saving...</Text>}
                </Flex>
            </Flex>

            <Flex direction="column" gap="8">
                {categories.map(category => (
                    <Box key={category.name}>
                        <Heading size="4" mb="4" className="text-gray-700 border-b pb-2">
                            {category.name}
                        </Heading>
                        <Grid columns={{ initial: '1', sm: '2', md: '3', lg: '4' }} gap="4">
                            {category.fields.map((field) => {
                                const value = getValueByPath(architecture, field.path);
                                const isFilled = isFieldFilled(value);
                                
                                return (
                                    <Card 
                                        key={field.id} 
                                        className={`cursor-pointer hover:shadow-md transition-all ${isFilled ? 'border-green-500 ring-1 ring-green-500' : 'border-l-4 border-l-purple-500'}`}
                                        onClick={() => setEditingFieldId(field.id)}
                                    >
                                        <Flex justify="between" align="start" className="mb-2">
                                            <Heading size="2" weight="bold" className={isFilled ? 'text-green-700' : 'text-gray-800'}>
                                                {field.title}
                                            </Heading>
                                            {isFilled ? (
                                                <CheckCircle size={16} className="text-green-500" />
                                            ) : (
                                                <Circle size={16} className="text-gray-300" />
                                            )}
                                        </Flex>
                                        <Text size="1" color="gray" className="line-clamp-3 mb-2">
                                            {field.description || (value && typeof value === 'string' ? value : "Click to edit...")}
                                        </Text>
                                        {isFilled && (
                                            <Badge color="green" radius="full" size="1">Completed</Badge>
                                        )}
                                    </Card>
                                );
                            })}
                        </Grid>
                    </Box>
                ))}
            </Flex>

            {activeField && (
                <FieldEditModal
                    isOpen={!!activeField}
                    onClose={() => setEditingFieldId(null)}
                    title={activeField.title}
                    description={activeField.description}
                    value={getValueByPath(architecture, activeField.path)}
                    onSave={(val) => handleUpdate(activeField.path, val)}
                    fieldType={activeField.type}
                    architectureTitle={architecture.title}
                    fieldPath={activeField.path}
                />
            )}
        </div>
    );
};
