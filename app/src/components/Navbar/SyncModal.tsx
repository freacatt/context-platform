import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useSyncStore } from '../../services/syncStore';
import { syncWithServer } from '../../services/syncService';
import { useAuth } from '../../contexts/AuthContext';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const { logs, isSyncing, lastSyncTime, clearLogs } = useSyncStore();
  const { user } = useAuth();

  const handleSync = async () => {
    await syncWithServer();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className={isSyncing ? "animate-spin" : ""} size={20} />
            Data Synchronization
          </DialogTitle>
          <DialogDescription>
             Manage data synchronization with the server.
             {lastSyncTime && (
                 <span className="block mt-1">
                     Last synced: {lastSyncTime.toLocaleString()}
                 </span>
             )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
           <div className="flex justify-between items-center">
               <h3 className="text-sm font-medium">Sync Logs</h3>
               <Button variant="ghost" size="sm" onClick={clearLogs} disabled={logs.length === 0}>
                   Clear Logs
               </Button>
           </div>
           
           <div className="border rounded-md bg-muted/50 p-2 flex-1 overflow-hidden">
                <ScrollArea className="h-[300px] pr-4">
                    {logs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            No logs available.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-2 items-start text-sm p-2 rounded hover:bg-muted/80">
                                    <div className="mt-0.5">
                                        {log.type === 'success' && <CheckCircle size={14} className="text-green-500" />}
                                        {log.type === 'error' && <XCircle size={14} className="text-red-500" />}
                                        {log.type === 'warning' && <AlertTriangle size={14} className="text-yellow-500" />}
                                        {log.type === 'info' && <Info size={14} className="text-blue-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="leading-tight">{log.message}</p>
                                        <span className="text-[10px] text-muted-foreground">
                                            {log.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
           </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSync} disabled={isSyncing || !user}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SyncModal;
