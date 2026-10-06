import { useRef, useState } from 'react';
import { useConvex, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { downloadFile, safeFilename } from '@/lib/download';
import { errorMessage } from '@/lib/errors';
import { useWorkspace } from './WorkspaceContext';

/** Downloads the current workspace as a JSON backup. */
export function ExportWorkspaceButton() {
  const convex = useConvex();
  const workspace = useWorkspace();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await convex.query(api.workspaces.exportData, { id: workspace._id });
      if (!data) throw new Error('Workspace not found');
      downloadFile(JSON.stringify(data, null, 2), safeFilename(workspace.name, 'workspace.json'), 'application/json');
      toast.success('Workspace exported');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to export workspace'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" className="gap-2 h-8" onClick={handleExport} disabled={busy} aria-label="Export workspace" title="Download the workspace as a JSON backup">
      {busy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
      <span className="hidden md:inline text-sm">Export workspace</span>
    </Button>
  );
}

/** Creates a new workspace from a JSON backup and opens it. */
export function ImportWorkspaceButton() {
  const importData = useMutation(api.workspaces.importData);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const workspaceId = await importData({ data: JSON.parse(await file.text()) });
      toast.success('Workspace imported');
      navigate(`/${workspaceId}/dashboard`);
    } catch (error) {
      toast.error(errorMessage(error, error instanceof SyntaxError ? 'That file is not valid JSON' : 'Import failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Import
      </Button>
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} data-testid="import-input" />
    </>
  );
}
