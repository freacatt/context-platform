import type { UiUxArchitectureSpec } from './types/uiUxArchitecture';

/** Empty UI/UX architecture (theme and components live in a linked design system). */
export const createDefaultUiUxArchitecture = (): UiUxArchitectureSpec => ({
  ui_ux_architecture_metadata: {
    document_id: 'UI_UX_ARCHITECTURE_v1.0',
    version: '1.0.0',
    parent_architecture_ref: 'PARENT_ARCH_CONTEXT_v1.0'
  },
  pages: [],
  ux_patterns: {
    main: {
      loading_states: { page_load: '', button_action: '', data_fetch: '' },
      error_states: { page_error: '', form_error: '', api_error: '' },
      empty_states: { no_data: '', no_results: '' }
    },
    advanced: {
      responsive_behavior: { mobile: '', tablet: '', desktop: '' }
    }
  }
});
