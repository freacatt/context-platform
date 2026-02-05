
import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getUserContextDocuments } from '../services/contextDocumentService';
import { 
  PACKAGE_JSON, 
  TSCONFIG_JSON, 
  SERVER_INDEX_TS, 
  SERVER_README_MD, 
  ROOT_README_MD 
} from '../utils/localMcpTemplate';
import { useAuth } from '../contexts/AuthContext';

interface UseLocalMcpExportReturn {
  isExporting: boolean;
  exportError: string | null;
  generateExport: (
    workspaceId: string, 
    workspaceName: string, 
    globalContextText: string, 
    includeDocs: boolean
  ) => Promise<void>;
}

export const useLocalMcpExport = (): UseLocalMcpExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { user } = useAuth();

  const generateExport = async (
    workspaceId: string, 
    workspaceName: string, 
    globalContextText: string, 
    includeDocs: boolean
  ) => {
    if (!user) {
      setExportError("User not authenticated");
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const zip = new JSZip();

      // 1. Prepare Data
      const documents: Array<{ id: string; title: string; content: string; type: string }> = [];

      if (includeDocs) {
        // Fetch all documents for the workspace (or user if workspace not strict)
        // Ideally pass workspaceId to filter
        const docs = await getUserContextDocuments(user.uid, workspaceId);
        docs.forEach(doc => {
          documents.push({
            id: doc.id,
            title: doc.title,
            content: doc.content || "",
            type: 'contextDocument'
          });
        });
      }

      const workspaceData = {
        workspaceId,
        workspaceName,
        exportedAt: new Date().toISOString(),
        globalContext: globalContextText,
        documents
      };

      // 2. Add Data to ZIP
      zip.folder("data")?.file("workspace.json", JSON.stringify(workspaceData, null, 2));

      // 3. Add Server Code to ZIP
      const serverFolder = zip.folder("server");
      if (serverFolder) {
        serverFolder.file("package.json", PACKAGE_JSON);
        serverFolder.file("tsconfig.json", TSCONFIG_JSON);
        serverFolder.file("README.md", SERVER_README_MD);
        
        const srcFolder = serverFolder.folder("src");
        if (srcFolder) {
          srcFolder.file("index.ts", SERVER_INDEX_TS);
        }
      }

      // 4. Add Top-level README
      zip.file("README.md", ROOT_README_MD);

      // 5. Generate and Download
      const content = await zip.generateAsync({ type: "blob" });
      const safeName = workspaceName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      saveAs(content, `mcp-local-${safeName}.zip`);

    } catch (error) {
      console.error("Export failed:", error);
      setExportError("Failed to generate export ZIP.");
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, exportError, generateExport };
};
