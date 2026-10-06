export interface ProductDefinitionNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
  question?: string;
  parent?: string;
  children?: string[];
}

/** Node map keyed by node id. The root node id is always "root". */
export type ProductDefinitionData = Record<string, ProductDefinitionNode>;
