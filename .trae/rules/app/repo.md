---
alwaysApply: false
applyMode: intelligence
description: Frontend app project structure, storage strategy, commands, and feature creation checklist.
---
# Repository Instructions — Context Platform

## Project Structure
```
app/src/
├── components/     # UI components (Shadcn UI, shared)
├── hooks/          # Custom React hooks
├── lib/            # Utilities (utils.ts)
├── pages/          # Route components
├── services/       # Business logic & Data Adapter
│   ├── storage.ts  # MAIN DATA ADAPTER (Local + Cloud)
│   ├── localDB.ts  # Dexie configuration
│   ├── firebase.ts # Firebase configuration
│   └── ...         # Domain services
├── types/          # TypeScript definitions
└── App.tsx         # Main entry point
```

## Storage Strategy (The "Data Adapter")
This project uses a unique **Dual-Storage Strategy**. 
- **Guest Users**: Data is saved **ONLY** to LocalDB (Dexie).
- **Auth Users**: Data can be saved to **BOTH** LocalDB and Firestore (configurable via Settings).
- **Synchronization**: The `storage` service handles syncing from Cloud to Local on read.

### Key Files
- `app/src/services/storage.ts`: The unified API for data access.
- `app/src/services/localDB.ts`: Dexie schema definitions.
- `app/firestore.rules`: Security rules for Cloud storage.

## Commands
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Deploy**: `npm run deploy` (Deploys to Firebase Hosting)
- **Lint**: `npm run lint`

## Security & Secrets
- **API Keys**: Stored in `.env` (Firebase config, etc.).
- **User Data**: Secured via Firestore Rules (`firestore.rules`).
- **Anthropic Key**: User-provided, stored securely in Firestore (never hardcoded).

## Creating New Features (Frontend app)
When creating a new feature in the frontend app (e.g., "Product Definition"):
1. **Define Types**: Add interface to `app/src/types/`.
2. **Update LocalDB**: Add table to `app/src/services/localDB.ts`.
3. **Update Firestore Rules**: Add match block to `app/firestore.rules`.
4. **Create Service**: Create `app/src/services/myFeatureService.ts` using the `storage` adapter.
5. **Build UI**: Create components and pages under `app/src/pages/` and `app/src/components/`.
