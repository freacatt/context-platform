import type { UiUxArchitectureSpec } from '../../types/uiUxArchitecture';

/** A UI/UX architecture as stored; sections may be missing on legacy documents. */
export type UiUxArchitectureInput = { title: string } & Partial<UiUxArchitectureSpec>;

const entries = (record: Record<string, string> | undefined) =>
  Object.entries(record ?? {}).map(([key, value]) => `- **${key}**: ${value}`);

export function uiUxArchitectureToMarkdown(arch: UiUxArchitectureInput): string {
  const lines = [`# ${arch.title}`, ''];
  const meta = arch.ui_ux_architecture_metadata;
  if (meta) lines.push(`**Version**: ${meta.version}`, `**Document ID**: ${meta.document_id}`, '');

  const theme = arch.theme_specification?.main;
  if (theme) {
    lines.push('## Theme Specification', '');
    if (theme.colors) lines.push('### Colors', ...entries(theme.colors), '');
    if (theme.typography) {
      lines.push('### Typography', `- **Font Family**: ${theme.typography.font_family}`, `- **Base Size**: ${theme.typography.font_size_base}`, '');
    }
  }

  if (arch.base_components?.length) {
    lines.push('## Base Components', '');
    for (const comp of arch.base_components) {
      if (!comp.main) continue;
      lines.push(`### ${comp.main.name}`, `- **Type**: ${comp.type}`, `- **Category**: ${comp.main.category}`);
      if (comp.main.description) lines.push(`- **Description**: ${comp.main.description}`);
      if (comp.main.required_props?.length) lines.push(`- **Required Props**: ${comp.main.required_props.join(', ')}`);
      lines.push('');
    }
  }

  if (arch.pages?.length) {
    lines.push('## Pages', '');
    for (const page of arch.pages) {
      if (!page.main) continue;
      lines.push(`### ${page.main.title} (${page.main.route})`);
      if (page.main.description) lines.push(`> ${page.main.description}`, '');
      lines.push(`- **Layout**: ${page.main.layout}`, `- **Auth Required**: ${page.main.requires_auth ? 'Yes' : 'No'}`);
      if (page.main.components?.length) {
        lines.push('', '**Components**:', ...page.main.components.map((c) => `- ${c.component_id} (x${c.instance_count})`));
      }
      lines.push('');
    }
  }

  const patterns = arch.ux_patterns?.main;
  if (patterns) {
    lines.push('## UX Patterns', '');
    if (patterns.loading_states) lines.push('### Loading States', ...entries(patterns.loading_states), '');
    if (patterns.error_states) lines.push('### Error States', ...entries(patterns.error_states), '');
  }
  return lines.join('\n');
}
