import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { UiUxArchitecture } from '../types/uiUxArchitecture';

const TABLE_NAME = 'uiUxArchitectures';

const mapArchitectureFromDB = (data: any, id: string): UiUxArchitecture | null => {
    if (!data) return null;
    return {
        id: id,
    userId: data.userId || data.user_id,
    workspaceId: data.workspaceId,
    title: data.title,
        createdAt: (data.createdAt || data.created_at) ? (typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toDate().toISOString()) : new Date().toISOString(),
        updatedAt: (data.updatedAt || data.updated_at) ? (typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt.toDate().toISOString()) : new Date().toISOString(),
        ui_ux_architecture_metadata: data.ui_ux_architecture_metadata,
        theme_specification: data.theme_specification,
        base_components: data.base_components,
        pages: data.pages,
        ux_patterns: data.ux_patterns
    };
};

export const createUiUxArchitecture = async (userId: string, title: string = "New UI/UX Architecture", workspaceId?: string): Promise<string | null> => {
    if (!userId) return null;

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
        const docRef = await addDoc(collection(db, TABLE_NAME), defaultArchitecture);
        return docRef.id;
    } catch (e) {
        console.error("Error creating UI/UX architecture: ", e);
        return null;
    }
};

export const getUserUiUxArchitectures = async (userId: string, workspaceId?: string): Promise<UiUxArchitecture[]> => {
    try {
        let q;
        if (workspaceId) {
            q = query(collection(db, TABLE_NAME), where("workspaceId", "==", workspaceId), where("userId", "==", userId));
        } else {
            q = query(collection(db, TABLE_NAME), where("userId", "==", userId));
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => mapArchitectureFromDB(doc.data(), doc.id)!).filter(Boolean);
    } catch (e) {
        console.error("Error fetching UI/UX architectures: ", e);
        return [];
    }
};

export const getUiUxArchitecture = async (id: string): Promise<UiUxArchitecture | null> => {
    try {
        const docRef = doc(db, TABLE_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return mapArchitectureFromDB(docSnap.data(), docSnap.id);
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
        const docRef = doc(db, TABLE_NAME, id);
        await updateDoc(docRef, {
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
        const docRef = doc(db, TABLE_NAME, id);
        await deleteDoc(docRef);
        return true;
    } catch (e) {
        console.error("Error deleting UI/UX architecture: ", e);
        return false;
    }
};

export const generateUiUxMarkdown = (arch: UiUxArchitecture): string => {
    // Helper maps for ID resolution
    const pageMap = new Map(arch.pages.map(p => [p.page_id, p.main.title]));
    const componentMap = new Map(arch.base_components.map(c => [c.component_id, c.main.name]));

    let md = `# ${arch.title}\n\n`;
    md += `**Document ID:** ${arch.ui_ux_architecture_metadata.document_id}\n`;
    md += `**Version:** ${arch.ui_ux_architecture_metadata.version}\n`;
    md += `**Parent Ref:** ${arch.ui_ux_architecture_metadata.parent_architecture_ref}\n`;
    md += `**Last Updated:** ${new Date(arch.updatedAt).toLocaleString()}\n\n`;

    // --- Theme Specification ---
    md += `## Theme Specification\n\n`;
    md += `### Colors\n`;
    md += `- **Primary:** ${arch.theme_specification.main.colors.primary}\n`;
    md += `- **Secondary:** ${arch.theme_specification.main.colors.secondary}\n`;
    md += `- **Success:** ${arch.theme_specification.main.colors.success}\n`;
    md += `- **Warning:** ${arch.theme_specification.main.colors.warning}\n`;
    md += `- **Error:** ${arch.theme_specification.main.colors.error}\n`;
    md += `- **Background:** ${arch.theme_specification.main.colors.background}\n`;
    md += `- **Text:** ${arch.theme_specification.main.colors.text}\n`;
    md += `- **Border:** ${arch.theme_specification.main.colors.border}\n\n`;

    md += `### Typography\n`;
    md += `- **Font Family:** ${arch.theme_specification.main.typography.font_family}\n`;
    md += `- **Base Size:** ${arch.theme_specification.main.typography.font_size_base}\n\n`;

    md += `### Layout & Spacing\n`;
    md += `- **Spacing Unit:** ${arch.theme_specification.main.spacing_unit}\n`;
    md += `- **Border Radius:** SM=${arch.theme_specification.main.border_radius.sm}, MD=${arch.theme_specification.main.border_radius.md}, LG=${arch.theme_specification.main.border_radius.lg}\n`;
    md += `- **Shadows:** SM=${arch.theme_specification.advanced.shadows.sm}, MD=${arch.theme_specification.advanced.shadows.md}, LG=${arch.theme_specification.advanced.shadows.lg}\n`;
    md += `- **Breakpoints:** Mobile=${arch.theme_specification.advanced.breakpoints.mobile}, Tablet=${arch.theme_specification.advanced.breakpoints.tablet}, Desktop=${arch.theme_specification.advanced.breakpoints.desktop}\n\n`;

    if (arch.theme_specification.main.description) {
        md += `> ${arch.theme_specification.main.description}\n\n`;
    }

    // --- Base Components ---
    md += `## Base Components\n\n`;
    if (arch.base_components.length === 0) {
        md += `*No components defined.*\n\n`;
    } else {
        arch.base_components.forEach(comp => {
            md += `### ${comp.main.name} (${comp.type})\n`;
            if (comp.main.description) md += `> ${comp.main.description}\n\n`;
            
            md += `- **Category:** ${comp.main.category}\n`;
            md += `- **File Path:** \`${comp.advanced.file_path || 'Not specified'}\`\n`;
            
            if (comp.main.required_props.length > 0) {
                md += `- **Required Props:** \`${comp.main.required_props.join('`, `')}\`\n`;
            }
            
            if (Object.keys(comp.advanced.props).length > 0) {
                md += `- **Other Props:**\n`;
                Object.entries(comp.advanced.props).forEach(([key, val]) => {
                    md += `  - \`${key}\`: ${val}\n`;
                });
            }
            md += `\n`;
        });
    }

    // --- Pages ---
    md += `## Pages\n\n`;
    if (arch.pages.length === 0) {
        md += `*No pages defined.*\n\n`;
    } else {
        arch.pages.forEach(page => {
            md += `### ${page.main.title} (\`${page.main.route}\`)\n`;
            if (page.main.description) md += `> ${page.main.description}\n\n`;
            
            md += `**Configuration:**\n`;
            md += `- **Layout:** ${page.main.layout}\n`;
            md += `- **Auth Required:** ${page.main.requires_auth ? 'Yes' : 'No'}\n`;
            if (page.main.requires_auth && page.main.redirect_if_not_authenticated) {
                md += `- **Redirect (Guest):** ${page.main.redirect_if_not_authenticated}\n`;
            }
            if (!page.main.requires_auth && page.main.redirect_if_authenticated) {
                md += `- **Redirect (Auth):** ${page.main.redirect_if_authenticated}\n`;
            }
            
            md += `\n**SEO & Data:**\n`;
            md += `- **Meta Title:** ${page.advanced.meta_title || 'N/A'}\n`;
            md += `- **Meta Desc:** ${page.advanced.meta_description || 'N/A'}\n`;
            if (page.advanced.data_fetching.endpoint) {
                md += `- **Data Fetch:** ${page.advanced.data_fetching.method} \`${page.advanced.data_fetching.endpoint}\` (TTL: ${page.advanced.data_fetching.cache_ttl})\n`;
            }

            if (page.main.components.length > 0) {
                md += `\n#### Page Components\n`;
                page.main.components.forEach(c => {
                    const compName = componentMap.get(c.component_id) || c.component_id;
                    md += `- **${compName}** (x${c.instance_count})\n`;
                    if (c.position) md += `  - Position: ${c.position}\n`;
                    if (c.data_source) md += `  - Data Source: ${c.data_source}\n`;
                });
            }

            if (page.main.navigation.length > 0) {
                md += `\n#### Navigation Flows\n`;
                page.main.navigation.forEach(n => {
                    const targetPageName = pageMap.get(n.to_page_id) || n.to_page_id;
                    md += `- **${n.user_action}** on *${n.trigger_element}* → **${targetPageName}**\n`;
                    if (n.condition_description) md += `  - Condition: ${n.condition_description}\n`;
                });
            }
            md += `\n---\n\n`;
        });
    }

    // --- UX Patterns ---
    md += `## UX Patterns\n\n`;
    
    md += `### Loading States\n`;
    md += `- **Page Load:** ${arch.ux_patterns.main.loading_states.page_load}\n`;
    md += `- **Button Action:** ${arch.ux_patterns.main.loading_states.button_action}\n`;
    md += `- **Data Fetch:** ${arch.ux_patterns.main.loading_states.data_fetch}\n\n`;

    md += `### Error States\n`;
    md += `- **Page Error:** ${arch.ux_patterns.main.error_states.page_error}\n`;
    md += `- **Form Error:** ${arch.ux_patterns.main.error_states.form_error}\n`;
    md += `- **API Error:** ${arch.ux_patterns.main.error_states.api_error}\n\n`;

    md += `### Empty States\n`;
    md += `- **No Data:** ${arch.ux_patterns.main.empty_states.no_data}\n`;
    md += `- **No Results:** ${arch.ux_patterns.main.empty_states.no_results}\n\n`;

    md += `### Responsive Behavior\n`;
    md += `- **Mobile:** ${arch.ux_patterns.advanced.responsive_behavior.mobile}\n`;
    md += `- **Tablet:** ${arch.ux_patterns.advanced.responsive_behavior.tablet}\n`;
    md += `- **Desktop:** ${arch.ux_patterns.advanced.responsive_behavior.desktop}\n`;

    return md;
};
