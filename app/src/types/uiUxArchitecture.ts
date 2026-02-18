export interface ThemeSpecification {
  main: {
    theme_id: string;
    colors: {
      primary: string;
      secondary: string;
      success: string;
      warning: string;
      error: string;
      background: string;
      text: string;
      border: string;
    };
    typography: {
      font_family: string;
      font_size_base: string;
    };
    spacing_unit: string;
    border_radius: {
      sm: string;
      md: string;
      lg: string;
    };
    description?: string;
  };
  advanced: {
    shadows: {
      sm: string;
      md: string;
      lg: string;
    };
    breakpoints: {
      mobile: string;
      tablet: string;
      desktop: string;
    };
    editor_metadata?: {
      x: number;
      y: number;
    };
  };
}

export interface BaseComponent {
  component_id: string;
  type: string;
  main: {
    name: string;
    category: string;
    required_props: string[];
    description?: string;
  };
  advanced: {
    file_path: string;
    props: Record<string, string>;
    editor_metadata?: {
      x: number;
      y: number;
    };
  };
}

export interface PageComponent {
  component_id: string;
  position: string;
  props: Record<string, string>;
  instance_count: string;
  data_source: string;
}

export interface PageNavigation {
  to_page_id: string;
  trigger_element: string;
  trigger_type: string;
  condition_description: string;
  user_action: string;
  source_handle?: string | null;
  target_handle?: string | null;
}

export interface Page {
  page_id: string;
  main: {
    route: string;
    title: string;
    layout: string;
    requires_auth: boolean;
    redirect_if_authenticated: string;
    redirect_if_not_authenticated: string;
    components: PageComponent[];
    navigation: PageNavigation[];
    description?: string;
    condition?: string;
  };
  advanced: {
    meta_title: string;
    meta_description: string;
    data_fetching: {
      endpoint: string;
      method: string;
      cache_ttl: string;
    };
    editor_metadata?: {
      x: number;
      y: number;
    };
  };
}

export interface UxPatterns {
  main: {
    loading_states: {
      page_load: string;
      button_action: string;
      data_fetch: string;
    };
    error_states: {
      page_error: string;
      form_error: string;
      api_error: string;
    };
    empty_states: {
      no_data: string;
      no_results: string;
    };
  };
  advanced: {
    responsive_behavior: {
      mobile: string;
      tablet: string;
      desktop: string;
    };
  };
}

export interface UiUxArchitectureMetadata {
  document_id: string;
  version: string;
  parent_architecture_ref: string;
}

export interface UiUxArchitecture {
  id: string; // Firebase ID
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  
  ui_ux_architecture_metadata: UiUxArchitectureMetadata;
  theme_specification: ThemeSpecification;
  base_components: BaseComponent[];
  pages: Page[];
  ux_patterns: UxPatterns;
}
