import { getPyramid } from './pyramidService';
import { getProductDefinition } from './productDefinitionService';
import { getContextDocument } from './contextDocumentService';
import { getTechnicalArchitecture } from './technicalArchitectureService';
import { getTechnicalTask } from './technicalTaskService';
import { getUiUxArchitecture } from './uiUxArchitectureService';
import { getDiagram } from './diagramService';
import { getDirectory, getDirectoryDocuments } from './directoryService';
import { ContextSource } from '../types';

export interface ContextDataResult {
  id: string;
  type: string;
  title: string;
  data: any;
  error?: string;
}

/**
 * Fetches the full data object for a given context source.
 * Returns a standardized result containing the fresh title and the raw data object.
 */
export const fetchContextData = async (source: ContextSource): Promise<ContextDataResult> => {
  try {
    let data: any = null;
    let title = source.title || "Untitled";

    switch (source.type) {
      case 'pyramid':
        const pyramid = await getPyramid(source.id);
        if (pyramid) {
          data = pyramid;
          title = pyramid.title;
        }
        break;

      case 'productDefinition':
        const pd = await getProductDefinition(source.id);
        if (pd) {
          data = pd;
          title = pd.title;
        }
        break;

      case 'technicalArchitecture':
        const ta = await getTechnicalArchitecture(source.id);
        if (ta) {
          data = ta;
          title = ta.title;
        }
        break;

      case 'technicalTask':
        const task = await getTechnicalTask(source.id);
        if (task) {
          data = task;
          title = task.title;
        }
        break;

      case 'uiUxArchitecture':
        const uiUx = await getUiUxArchitecture(source.id);
        if (uiUx) {
          data = uiUx;
          title = uiUx.title;
        }
        break;

      case 'contextDocument':
        const doc = await getContextDocument(source.id);
        if (doc) {
          data = doc;
          title = doc.title;
        }
        break;

      case 'directory':
        const dir = await getDirectory(source.id);
        if (dir) {
          const docs = await getDirectoryDocuments(dir.userId, dir.id);
          data = { directory: dir, documents: docs };
          title = dir.title;
        }
        break;

      case 'diagram':
        const diagram = await getDiagram(source.id);
        if (diagram) {
          data = diagram;
          title = diagram.title;
        }
        break;

      default:
        return {
          id: source.id,
          type: source.type,
          title: title,
          data: null,
          error: `Unknown context type: ${source.type}`
        };
    }

    if (!data) {
      return {
        id: source.id,
        type: source.type,
        title: title,
        data: null,
        error: "Data not found or could not be loaded"
      };
    }

    return {
      id: source.id,
      type: source.type,
      title: title,
      data: data
    };

  } catch (error) {
    return {
      id: source.id,
      type: source.type,
      title: source.title || "Error",
      data: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Formats a ContextDataResult into a text block suitable for the AI.
 * It uses JSON serialization for the data content to ensure no details are lost.
 */
export const formatContextDataForAI = (result: ContextDataResult): string => {
  let output = `\n--- START ${result.type.toUpperCase()}: ${result.title} ---\n`;
  output += `**ID:** ${result.id}\n`;
  output += `**Type:** ${result.type}\n`;
  output += `**Title:** ${result.title}\n`;
  
  if (result.error) {
    output += `**Status:** Error loading data\n`;
    output += `**Error Details:** ${result.error}\n`;
  } else {
    output += `**Status:** Loaded successfully\n`;
    output += `**Content (JSON):**\n`;
    output += "```json\n";
    output += JSON.stringify(result.data, null, 2);
    output += "\n```\n";
  }
  
  output += `--- END ${result.type.toUpperCase()}: ${result.title} ---\n`;
  return output;
};
