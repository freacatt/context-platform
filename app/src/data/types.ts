/**
 * Entity types as the UI sees them: Convex documents, with the editor-owned JSON
 * fields (typed `any` in the schema) narrowed to their shared domain types.
 */
import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { UiUxArchitectureSpec } from '@shared/types/uiUxArchitecture';

export type { Id };

export type Workspace = Doc<'workspaces'>;
export type Pyramid = Doc<'pyramids'>;
export type ProductDefinition = Doc<'productDefinitions'>;
export type Directory = Doc<'directories'>;
export type ContextDocument = Doc<'contextDocuments'>;
export type Diagram = Doc<'diagrams'>;

export type UiUxArchitecture = Omit<Doc<'uiUxArchitectures'>, keyof UiUxArchitectureSpec> & UiUxArchitectureSpec;
