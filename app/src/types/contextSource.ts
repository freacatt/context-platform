export interface ContextSource {
  id: string;
  type: 'contextDocument' | 'productDefinition' | 'pyramid' | 'technicalArchitecture' | 'technicalTask' | 'uiUxArchitecture' | 'directory' | 'diagram';
  title?: string;
}
