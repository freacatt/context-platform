import { db } from '../firebase.js';

export interface ContextSource {
  id: string;
  type: string;
  title?: string;
}

export const fetchAggregatedContext = async (workspaceId: string): Promise<string> => {
  // 1. Get Sources
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) return "Workspace not found";
  
  const data = workspaceDoc.data();
  const sources: ContextSource[] = data?.globalContextSources || [];

  if (sources.length === 0) return "No global context configured for this workspace.";

  let aggregated = "";

  // 2. Fetch each source
  for (const source of sources) {
    aggregated += `\n\n--- Source: ${source.title || source.type} ---\n`;
    
    try {
      let content = "";
      switch (source.type) {
        case 'pyramid':
          const pDoc = await db.collection('pyramids').doc(source.id).get();
          if (pDoc.exists) {
             const pData = pDoc.data();
             content = `Title: ${pData?.title}\nContext: ${pData?.context}\n`;
             // Could add blocks if needed
          }
          break;
        case 'productDefinition':
          const pdDoc = await db.collection('productDefinitions').doc(source.id).get();
          if (pdDoc.exists) {
             content = JSON.stringify(pdDoc.data()?.data || {}, null, 2);
          }
          break;
        case 'contextDocument':
          const cDoc = await db.collection('contextDocuments').doc(source.id).get();
          if (cDoc.exists) {
             content = cDoc.data()?.content || "";
          }
          break;
        case 'technicalArchitecture':
          const taDoc = await db.collection('technicalArchitectures').doc(source.id).get();
          if (taDoc.exists) {
             content = taDoc.data()?.content || "";
          }
          break;
        // Add other types as needed
        default:
          content = `[Type ${source.type} not yet supported in MCP Gateway]`;
      }
      aggregated += content;
    } catch (e) {
      aggregated += `[Error fetching source: ${e}]`;
    }
  }

  return aggregated;
};
