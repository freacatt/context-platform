import Dexie, { Table } from 'dexie';
import {
  Pyramid,
  Workspace,
  ProductDefinition,
  ContextDocument,
  Directory,
  UiUxArchitecture,
  Diagram,
  TechnicalArchitecture
} from '../types';
import { Pipeline, TechnicalTask } from '../types/technicalTask';

// We need to extend the types to ensure they are compatible with Dexie storage
// (e.g. Dates might need to be stored as strings or numbers if we want to index them properly, 
// but Dexie supports Date objects. However, for JSON export/import, we might need serialization)

export class LocalDB extends Dexie {
  workspaces!: Table<Workspace>;
  pyramids!: Table<Pyramid>;
  productDefinitions!: Table<ProductDefinition>;
  contextDocuments!: Table<ContextDocument>;
  // We might need to store user settings locally too
  userSettings!: Table<{ id: string, userId: string, saveLocally: boolean, saveToCloud: boolean }>;

  // New tables
  directories!: Table<Directory>;
  uiUxArchitectures!: Table<UiUxArchitecture>;
  diagrams!: Table<Diagram>;
  technicalTasks!: Table<TechnicalTask>;
  pipelines!: Table<Pipeline>;
  technicalArchitectures!: Table<TechnicalArchitecture>;
  globalTasks!: Table<TechnicalTask>;
  workspace_mcp_settings!: Table<{ id: string, userId: string, workspaceId: string, [key: string]: any }>;

  constructor() {
    super('ContextPlatformDB');
    
    // Define tables and indexes
    // 'id' is the primary key
    // We index by userId and workspaceId for filtering
    this.version(1).stores({
      workspaces: 'id, userId',
      pyramids: 'id, userId, workspaceId',
      productDefinitions: 'id, userId, workspaceId',
      contextDocuments: 'id, userId, workspaceId, directoryId',
      conversations: 'id, userId, workspaceId',
      messages: 'id, userId, parentId',
      userSettings: 'id, userId'
    });

    this.version(2).stores({
        directories: 'id, userId, workspaceId',
        uiUxArchitectures: 'id, userId, workspaceId',
        diagrams: 'id, userId, workspaceId',
        technicalTasks: 'id, userId, workspaceId, pipelineId',
        pipelines: 'id, userId, workspaceId',
        technicalArchitectures: 'id, userId, workspaceId',
        globalTasks: 'id, userId, workspaceId, pipelineId'
    });

    this.version(3).stores({
        users: 'id, email'
    });

    this.version(4).stores({
        workspace_mcp_settings: 'id, userId, workspaceId'
    });

    // v5: Remove legacy conversations and messages tables (sessions replace them)
    this.version(5).stores({
        conversations: null,
        messages: null
    });
  }

  async clearAllData() {
    await this.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map(table => table.clear()));
    });
  }
}

export const localDB = new LocalDB();
