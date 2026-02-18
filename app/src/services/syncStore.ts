import { create } from 'zustand';

export interface SyncLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  details?: any;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  logs: SyncLog[];
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (date: Date) => void;
  addLog: (message: string, type?: SyncLog['type'], details?: any) => void;
  clearLogs: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncTime: null,
  logs: [],
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  addLog: (message, type = 'info', details) => set((state) => ({
    logs: [
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        message,
        type,
        details
      },
      ...state.logs
    ].slice(0, 100) // Keep last 100 logs
  })),
  clearLogs: () => set({ logs: [] }),
}));
