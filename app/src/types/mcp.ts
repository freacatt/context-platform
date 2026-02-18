export interface McpAccessKey {
  id: string;
  label: string;
  keyPrefix: string; // Show first few chars
  hashedKey: string; // Store SHA-256 hash
  createdAt: string; // ISO String
  lastUsedAt?: string; // ISO String
}

export interface WorkspaceMcpSettings {
  id: string; // Usually same as workspaceId or auto-generated
  workspaceId: string;
  userId: string; // Owner
  enabled: boolean;
  allowedTools: string[]; // e.g. ['read_resource', 'list_resources']
  exposeDocuments: boolean; // Controls if document resources are listed
  exposeGlobalContext: boolean; // Controls if global context resource is listed
  maxContextSize: number; // Max characters/tokens
  accessKeys: McpAccessKey[];
  createdAt: string;
  updatedAt: string;
}
