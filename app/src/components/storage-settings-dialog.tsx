import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Database, Download, Upload, Loader2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { storage, getStorageSettings } from "@/services/storage";
import { localDB } from "@/services/localDB";
import { toast } from "sonner";

export function StorageSettingsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { user, isGuest } = useAuth();
  const [open, setOpen] = useState(false);
  const [saveLocally, setSaveLocally] = useState(true);
  const [saveToCloud, setSaveToCloud] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ total: number; imported: number; skipped: number } | null>(null);

  useEffect(() => {
    if (open) {
      const settings = getStorageSettings();
      setSaveLocally(settings.saveLocally);
      setSaveToCloud(settings.saveToCloud);
    }
  }, [open]);

  const handleSaveSettings = () => {
    localStorage.setItem('settings_saveLocally', String(saveLocally));
    localStorage.setItem('settings_saveToCloud', String(saveToCloud));
    toast.success("Storage settings saved");
    setOpen(false);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const data: Record<string, any> = {};
      
      // Export all tables from LocalDB
      await Promise.all(localDB.tables.map(async (table) => {
        data[table.name] = await table.toArray();
      }));

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `context-platform-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setProgress(0);
      setImportStats(null);

      const text = await file.text();
      const data = JSON.parse(text);
      
      // Calculate total items
      let totalItems = 0;
      for (const items of Object.values(data)) {
        if (Array.isArray(items)) totalItems += items.length;
      }

      if (totalItems === 0) {
        toast.info("No items found in import file");
        setLoading(false);
        return;
      }
      
      // Import data
      let processed = 0;
      let imported = 0;
      let skipped = 0;
      
      // We process each table
      for (const [tableName, items] of Object.entries(data)) {
        if (!Array.isArray(items)) continue;
        
        for (const item of items) {
          const existing = await storage.get(tableName, item.id);
          if (!existing) {
             if (user) {
               item.userId = user.uid;
             }
             
             await storage.save(tableName, item);
             imported++;
          } else {
             skipped++;
          }
          
          processed++;
          setProgress(Math.round((processed / totalItems) * 100));
        }
      }

      setImportStats({ total: totalItems, imported, skipped });

      if (skipped > 0) {
          toast.warning(`Import complete: ${imported} imported, ${skipped} skipped (duplicates)`);
      } else {
          toast.success(`Import complete: ${imported} items imported successfully`);
      }

      e.target.value = ''; // Reset input
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant="ghost" size="icon" title="Data Settings">
            <Database className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Data Storage Settings</DialogTitle>
          <DialogDescription>
            Manage how your data is stored and synced.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="local-storage" className="flex flex-col space-y-1">
              <span>Local Storage</span>
              <span className="font-normal text-xs text-muted-foreground">
                Save data to your browser (Offline available)
              </span>
            </Label>
            <Switch
              id="local-storage"
              checked={saveLocally}
              onCheckedChange={setSaveLocally}
              disabled={isGuest} // Guest must have local storage
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="cloud-storage" className="flex flex-col space-y-1">
              <span>Cloud Storage (Firestore)</span>
              <span className="font-normal text-xs text-muted-foreground">
                Sync data to server (Requires Login)
              </span>
            </Label>
            <Switch
              id="cloud-storage"
              checked={saveToCloud}
              onCheckedChange={setSaveToCloud}
              disabled={isGuest || !user} // Guest cannot save to cloud
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Data Management</h4>
            
            <Button variant="outline" className="w-full justify-start" onClick={handleExport} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Extract My Data (Export JSON)
            </Button>

            <div className="relative">
               <Button variant="outline" className="w-full justify-start" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import Data
              </Button>
              <input
                type="file"
                accept=".json"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImport}
                disabled={loading}
              />
            </div>
            
            {(loading || importStats) && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {importStats && (
                   <p className="text-xs text-muted-foreground text-center pt-1">
                     {importStats.imported} imported, {importStats.skipped} skipped (duplicates)
                   </p>
                )}
              </div>
            )}
          </div>

        </div>
        <DialogFooter>
          <Button onClick={handleSaveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
