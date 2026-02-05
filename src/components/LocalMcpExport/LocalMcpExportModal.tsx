import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Loader2, Info, Copy, Check } from 'lucide-react';
import { useLocalMcpExport } from '../../hooks/useLocalMcpExport';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useGlobalContext } from '../../contexts/GlobalContext';

interface LocalMcpExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalMcpExportModal: React.FC<LocalMcpExportModalProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace } = useWorkspace();
  const { aggregatedContext } = useGlobalContext();
  const { isExporting, exportError, generateExport } = useLocalMcpExport();
  const [includeDocs, setIncludeDocs] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    if (!currentWorkspace) return;
    
    await generateExport(
      currentWorkspace.id,
      currentWorkspace.name,
      aggregatedContext,
      includeDocs
    );
  };

  const copyConfig = () => {
    if (!currentWorkspace) return;
    const config = JSON.stringify({
      "mcpServers": {
        [`local-${currentWorkspace.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`]: {
          "url": "http://localhost:3333/sse"
        }
      }
    }, null, 2);
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentWorkspace) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export Local MCP Server</DialogTitle>
          <DialogDescription>
            Download a standalone, offline-capable MCP server containing your current workspace context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeDocs" 
              checked={includeDocs}
              onCheckedChange={(checked) => setIncludeDocs(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="includeDocs" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Include Context Documents
              </Label>
              <p className="text-sm text-muted-foreground">
                If checked, all context documents will be included in the export (increases file size).
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">About Local Export</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>Runs entirely offline on your machine.</li>
                  <li>Includes a complete Node.js server setup.</li>
                  <li>Data is a snapshot at the time of export (does not sync).</li>
                  <li>Safe to use with local AI models or private networks.</li>
                </ul>
              </div>
            </div>
          </div>

          {exportError && (
            <Alert variant="destructive">
              <AlertTitle>Export Failed</AlertTitle>
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
             <div className="space-y-2 border-t pt-4">
                <h4 className="text-sm font-semibold">How to Run Locally</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                    <p>1. Unzip the downloaded file</p>
                    <p>2. In the <code className="bg-muted px-1 rounded">server</code> directory, run: <code className="bg-muted px-1 rounded">npm install</code></p>
                    <p>3. Start the server: <code className="bg-muted px-1 rounded">npm run dev</code></p>
                </div>
             </div>

             <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Connect AI Client (SSE)</h4>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={copyConfig}
                    >
                        {copied ? (
                            <>
                                <Check className="mr-1 h-3 w-3" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="mr-1 h-3 w-3" />
                                Copy Config
                            </>
                        )}
                    </Button>
                </div>
                <div className="rounded-md bg-slate-950 p-3">
                    <pre className="text-xs text-slate-50 overflow-x-auto">
{JSON.stringify({
  "mcpServers": {
    [`local-${currentWorkspace.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`]: {
      "url": "http://localhost:3333/sse"
    }
  }
}, null, 2)}
                    </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                    Use this configuration for clients that support SSE connections (e.g., some Claude Desktop setups or web clients).
                </p>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
                onClick={handleExport} 
                disabled={isExporting || !currentWorkspace}
            >
                {isExporting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating ZIP...
                </>
                ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Download Local Server ZIP
                </>
                )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
