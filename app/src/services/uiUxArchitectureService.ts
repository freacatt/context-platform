import { storage } from './storage';
import { UiUxArchitecture } from '../types/uiUxArchitecture';

const TABLE_NAME = 'uiUxArchitectures';

const mapArchitectureFromStorage = (data: any): UiUxArchitecture => {
    return {
        id: data.id,
        userId: data.userId || data.user_id,
        workspaceId: data.workspaceId,
        title: data.title,
        createdAt: (data.createdAt || data.created_at) ? (typeof data.createdAt === 'string' ? data.createdAt : new Date(data.createdAt.seconds * 1000).toISOString()) : new Date().toISOString(),
        updatedAt: (data.updatedAt || data.updated_at) ? (typeof data.updatedAt === 'string' ? data.updatedAt : new Date(data.updatedAt.seconds * 1000).toISOString()) : new Date().toISOString(),
        ui_ux_architecture_metadata: data.ui_ux_architecture_metadata,
        theme_specification: data.theme_specification,
        base_components: data.base_components,
        pages: data.pages,
        ux_patterns: data.ux_patterns
    };
};

export const createUiUxArchitecture = async (userId: string, title: string = "New UI/UX Architecture", workspaceId?: string): Promise<string | null> => {
    if (!userId) return null;

    const id = storage.createId();
    const defaultArchitecture: Omit<UiUxArchitecture, 'id'> = {
        userId: userId,
        workspaceId: workspaceId || undefined,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ui_ux_architecture_metadata: {
            document_id: "UI_UX_ARCHITECTURE_v1.0",
            version: "1.0.0",
            parent_architecture_ref: "PARENT_ARCH_CONTEXT_v1.0"
        },
        theme_specification: {
            main: {
                theme_id: "",
                colors: {
                    primary: "", secondary: "", success: "", warning: "", error: "", background: "", text: "", border: ""
                },
                typography: { font_family: "", font_size_base: "" },
                spacing_unit: "",
                border_radius: { sm: "", md: "", lg: "" }
            },
            advanced: {
                shadows: { sm: "", md: "", lg: "" },
                breakpoints: { mobile: "", tablet: "", desktop: "" }
            }
        },
        base_components: [],
        pages: [],
        ux_patterns: {
            main: {
                loading_states: { page_load: "", button_action: "", data_fetch: "" },
                error_states: { page_error: "", form_error: "", api_error: "" },
                empty_states: { no_data: "", no_results: "" }
            },
            advanced: {
                responsive_behavior: { mobile: "", tablet: "", desktop: "" }
            }
        }
    };

    try {
        await storage.save(TABLE_NAME, { ...defaultArchitecture, id });
        return id;
    } catch (e) {
        console.error("Error creating UI/UX architecture: ", e);
        return null;
    }
};

export const getUserUiUxArchitectures = async (userId: string, workspaceId?: string): Promise<UiUxArchitecture[]> => {
    try {
        const results = await storage.query(TABLE_NAME, { userId, workspaceId });
        return results.map(mapArchitectureFromStorage);
    } catch (e) {
        console.error("Error fetching UI/UX architectures: ", e);
        return [];
    }
};

export const getUiUxArchitecture = async (id: string): Promise<UiUxArchitecture | null> => {
    try {
        const data = await storage.get(TABLE_NAME, id);
        if (data) {
            return mapArchitectureFromStorage(data);
        }
        return null;
    } catch (e: any) {
        if (e?.code !== 'permission-denied') {
            console.error("Error fetching UI/UX architecture: ", e);
        }
        return null;
    }
};

export const updateUiUxArchitecture = async (id: string, updates: Partial<UiUxArchitecture>): Promise<boolean> => {
    try {
        await storage.update(TABLE_NAME, id, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error("Error updating UI/UX architecture: ", e);
        return false;
    }
};

export const deleteUiUxArchitecture = async (id: string): Promise<boolean> => {
    try {
        await storage.delete(TABLE_NAME, id);
        return true;
    } catch (e) {
        console.error("Error deleting UI/UX architecture: ", e);
        return false;
    }
};

export const generateUiUxMarkdown = (arch: UiUxArchitecture): string => {
    let md = `# ${arch.title}\n\n`;
    
    // Metadata
    if (arch.ui_ux_architecture_metadata) {
        md += `**Version**: ${arch.ui_ux_architecture_metadata.version}\n`;
        md += `**Document ID**: ${arch.ui_ux_architecture_metadata.document_id}\n\n`;
    }

    // Theme
    if (arch.theme_specification && arch.theme_specification.main) {
        md += `## Theme Specification\n\n`;
        const theme = arch.theme_specification.main;
        if (theme.colors) {
            md += `### Colors\n`;
            Object.entries(theme.colors).forEach(([key, value]) => {
                md += `- **${key}**: ${value}\n`;
            });
        }
        if (theme.typography) {
            md += `\n### Typography\n`;
            md += `- **Font Family**: ${theme.typography.font_family}\n`;
            md += `- **Base Size**: ${theme.typography.font_size_base}\n\n`;
        }
    }

    // Components
    if (arch.base_components && arch.base_components.length > 0) {
        md += `## Base Components\n\n`;
        arch.base_components.forEach(comp => {
            if (comp.main) {
                md += `### ${comp.main.name}\n`;
                md += `- **Type**: ${comp.type}\n`;
                md += `- **Category**: ${comp.main.category}\n`;
                if (comp.main.description) md += `- **Description**: ${comp.main.description}\n`;
                if (comp.main.required_props) md += `- **Required Props**: ${comp.main.required_props.join(', ')}\n\n`;
            }
        });
    }

    // Pages
    if (arch.pages && arch.pages.length > 0) {
        md += `## Pages\n\n`;
        arch.pages.forEach(page => {
            if (page.main) {
                md += `### ${page.main.title} (${page.main.route})\n`;
                if (page.main.description) md += `> ${page.main.description}\n\n`;
                md += `- **Layout**: ${page.main.layout}\n`;
                md += `- **Auth Required**: ${page.main.requires_auth ? 'Yes' : 'No'}\n`;
                
                if (page.main.components && page.main.components.length > 0) {
                    md += `\n**Components**:\n`;
                    page.main.components.forEach(c => {
                        md += `- ${c.component_id} (x${c.instance_count})\n`;
                    });
                }
                md += `\n`;
            }
        });
    }

    // UX Patterns
    if (arch.ux_patterns && arch.ux_patterns.main) {
        md += `## UX Patterns\n\n`;
        const patterns = arch.ux_patterns.main;
        if (patterns.loading_states) {
            md += `### Loading States\n`;
            Object.entries(patterns.loading_states).forEach(([key, value]) => {
                md += `- **${key}**: ${value}\n`;
            });
        }
        if (patterns.error_states) {
            md += `\n### Error States\n`;
            Object.entries(patterns.error_states).forEach(([key, value]) => {
                md += `- **${key}**: ${value}\n`;
            });
        }
    }

    return md;
};
