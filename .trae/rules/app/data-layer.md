---
alwaysApply: false
applyMode: intelligence
description: Detailed documentation of the frontend storage adapter and data layer in app/src/.
---
# Data Layer & Storage Adapter Documentation

## Overview
The **Data Adapter** (`app/src/services/storage.ts`) is the core mechanism for data persistence in the Context Platform application. It provides a unified interface for interacting with both **Local Storage (IndexedDB via Dexie)** and **Cloud Storage (Firebase Firestore)**.

## Purpose
- **Offline First**: Allows the app to work without an internet connection.
- **Privacy Focused**: Guest users keep data entirely local.
- **Sync Capable**: Authenticated users can sync data across devices via Firestore.

## Architecture

### The Storage Service (`storage.ts`)
This service exports a `storage` object with standard CRUD methods:
- `create(collection, data)`
- `update(collection, id, data)`
- `delete(collection, id)`
- `get(collection, id)`
- `query(collection, filters)`
- `subscribe(collection, id, callback)`

### How it Works
1. **Settings Check**: Every operation checks `getStorageSettings()` to see if `saveLocally` and/or `saveToCloud` are enabled.
2. **Parallel Operations**: If both are enabled, operations are performed on both Dexie and Firestore.
   - *Note*: Local operations are awaited, but Cloud operations might be optimistic or awaited depending on the method implementation (currently awaited in `storage.ts`).
3. **Read Strategy**:
   - Tries LocalDB first (faster).
   - If not found locally, tries Firestore.
   - **Auto-Sync**: If found in Firestore but not LocalDB, it saves it to LocalDB for future access.

## Implementing a New Data Model

To add a new data entity (e.g., "Project"):

### 1. Define the Type
In `app/src/types/index.ts`:
```typescript
export interface Project {
  id: string;
  userId: string;
  name: string;
  // ... other fields
}
```

### 2. Register in LocalDB
In `app/src/services/localDB.ts`:
```typescript
class PyramidDB extends Dexie {
  projects!: Table<Project>;
  
  constructor() {
    super('ContextPlatformDB');
    this.version(1).stores({
      // Add schema here. Primary key 'id' is required.
      // Index fields used for querying (e.g., userId).
      projects: 'id, userId' 
    });
  }
}
```

### 3. Secure in Firestore
In `app/firestore.rules`:
```javascript
match /projects/{projectId} {
  allow create: if isOwner(request.resource.data.userId);
  allow read, update, delete: if isOwner(resource.data.userId);
}
```

### 4. Create a Service
Create `app/src/services/projectService.ts`:
```typescript
import { storage } from './storage';
import { Project } from '../types';

const COLLECTION = 'projects';

export const createProject = async (userId: string, data: Partial<Project>) => {
  const id = storage.createId();
  const newProject = { id, userId, ...data };
  await storage.create(COLLECTION, newProject);
  return id;
};

export const getProjects = async (userId: string) => {
  return await storage.query(COLLECTION, { userId });
};
```

## Best Practices
- **Always use `storage.createId()`** (nanoid) for IDs to ensure they are URL-safe and collision-resistant across both local and cloud.
- **Querying**: The `storage.query` method supports simple key-value filtering. For complex queries, you may need to fetch more data and filter in memory, or enhance the adapter.
- **Subscriptions**: Use `storage.subscribe` for real-time updates in the UI. It handles Firestore listeners automatically.
