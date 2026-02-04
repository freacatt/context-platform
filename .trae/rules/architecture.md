# Architecture Documentation

## Overview
Pyramid Solver is a Single Page Application (SPA) built with **React 19** and **Vite**, designed to run in the browser with offline capabilities. It uses a **Dual-Storage Architecture** to support both local-only usage (Guest mode) and cloud synchronization (Authenticated mode).

## Technology Stack
- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn UI (Radix Primitives)
- **State Management**: Zustand + React Context
- **Routing**: React Router DOM v7
- **Database**: 
  - **Local**: Dexie.js (IndexedDB wrapper)
  - **Cloud**: Firebase Firestore
- **Authentication**: Firebase Auth
- **AI Integration**: Anthropic SDK / Vercel AI SDK

## Core Architecture Patterns

### 1. Data Adapter Pattern (Storage Layer)
The most critical architectural component is the **Storage Adapter** (`src/services/storage.ts`). 
- **Purpose**: Abstracts the underlying database technology from the application logic.
- **Functionality**:
  - Handles reading/writing to **LocalDB (Dexie)** and/or **Firestore** based on user settings.
  - Supports "Guest" mode (Local only) and "Authenticated" mode (Cloud + Local).
  - Implements synchronization logic (Cloud → Local sync on read).
  - Provides a unified API (`get`, `create`, `update`, `delete`, `query`, `subscribe`) that mimics Firestore's API but works for both sources.

### 2. Context Adapter Pattern (Data Aggregation)
The **Context Adapter** (`src/services/contextAdapter.ts`) provides a unified interface to retrieve domain objects from various services.
- **Purpose**: Acts as a facade to fetch heterogeneous data types (Pyramids, Product Definitions, Technical Architectures, etc.) using a common `ContextSource` interface.
- **Usage**: Used by AI services or UI components that need to consume "Context" without knowing the specific service implementation for each type.

### 3. Service Layer
Business logic and data access are encapsulated in **Services** (`src/services/`).
- **Responsibility**: 
  - Interact with the Storage Adapter.
  - Handle domain-specific logic (e.g., `technicalArchitectureService`, `directoryService`).
  - Manage side effects (AI calls, external APIs).
- **Rule**: UI components should call Services, not the Storage Adapter directly (unless for simple hooks).

### 4. UI/UX Architecture
- **Component Library**: Reusable components in `src/components/ui/` (Shadcn UI).
- **Layouts**: Page layouts handle common structures (headers, sidebars).
- **Hooks**: Custom hooks (`src/hooks/`) encapsulate stateful logic and service subscriptions.

## Data Flow
1. **User Action**: User interacts with UI (e.g., "Save Architecture").
2. **Component**: Calls a Service method (e.g., `saveArchitecture`).
3. **Service**: Validates data and calls `storage.create` or `storage.update`.
4. **Storage Adapter**:
   - Checks `saveLocally` and `saveToCloud` settings.
   - Writes to Dexie (if local enabled).
   - Writes to Firestore (if cloud enabled).
5. **Feedback**: UI updates via real-time subscriptions (`storage.subscribe`) or state updates.

## Scalability & Extensibility
- **New Features**: When adding a new feature (e.g., "Product Definition"), create a new Service that utilizes the existing `storage` adapter.
- **Data Models**: Define TypeScript interfaces in `src/types/` and ensure they are compatible with both storage engines.
