import { storage } from './storage';
import { ProductDefinition, ProductDefinitionNode } from '../types';
import {
  DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID,
  BLANK_PRODUCT_DEFINITION_TEMPLATE_ID,
  getProductDefinitionTemplateById,
} from './productDefinitionTemplates';

const TABLE_NAME = 'productDefinitions';

// Helper to map DB snake_case to JS camelCase
// Storage adapter returns normalized data, but let's keep this safe
const mapDefinitionFromStorage = (data: any): ProductDefinition | null => {
    if (!data) return null;
    return {
        id: data.id,
        userId: data.userId || data.user_id,
        workspaceId: data.workspaceId,
        title: data.title,
        createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
        lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null,
        linkedPyramidId: data.linkedPyramidId || data.linked_pyramid_id,
        contextSources: data.contextSources || data.context_sources,
        data: data.data
    };
};

/**
 * Create a new product definition from a template
 */
export const createProductDefinition = async (
  userId: string,
  title: string = 'New Product Definition',
  workspaceId?: string,
  templateId?: string,
): Promise<string | null> => {
  if (!userId) return null;

  const id = storage.createId();
  const effectiveTemplateId =
    templateId || DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID;

  const template =
    getProductDefinitionTemplateById(effectiveTemplateId) ||
    getProductDefinitionTemplateById(BLANK_PRODUCT_DEFINITION_TEMPLATE_ID);

  const data = template ? template.data : {};

  const newDoc = {
    id,
    userId: userId,
    workspaceId: workspaceId || null,
    title,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    linkedPyramidId: null,
    contextSources: [],
    data,
  };

  try {
    await storage.save(TABLE_NAME, newDoc);
    return id;
  } catch (error) {
    console.error('Error creating product definition:', error);
    throw error;
  }
};

/**
 * Get a single product definition
 */
export const getProductDefinition = async (id: string): Promise<ProductDefinition> => {
  try {
      const data = await storage.get(TABLE_NAME, id);

      if (!data) {
          throw new Error("Product Definition not found");
      }

      return mapDefinitionFromStorage(data) as ProductDefinition;
  } catch (error: any) {
      // Filter out permission denied errors to avoid console noise
      if (error?.code !== 'permission-denied' && !error?.message?.includes('Missing or insufficient permissions')) {
          console.error("Error fetching product definition:", error);
      }
      throw error;
  }
};

/**
 * Get all product definitions for a user
 */
export const getUserProductDefinitions = async (userId: string, workspaceId?: string): Promise<ProductDefinition[]> => {
      try {
        const results = await storage.query(TABLE_NAME, { userId, workspaceId });
        
        const definitions = results.map(mapDefinitionFromStorage).filter((d): d is ProductDefinition => d !== null);
        
        // Sort in memory
        return definitions.sort((a, b) => {
            const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
            const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
            return dateB - dateA;
        });
    } catch (error: any) {
        if (error?.code !== 'permission-denied' && !error?.message?.includes('Missing or insufficient permissions')) {
            console.error("Error fetching product definitions:", error);
        }
        throw error;
    }
};

/**
 * Update a node's description or other data
 */
export const updateProductDefinitionNode = async (definitionId: string, nodeId: string, newData: Partial<ProductDefinitionNode>) => {
  // Use dot notation to update nested fields efficiently
  const updatePayload: any = {
      lastModified: new Date().toISOString()
  };

  for (const key in newData) {
      // @ts-ignore
      updatePayload[`data.${nodeId}.${key}`] = newData[key];
  }

  try {
      await storage.update(TABLE_NAME, definitionId, updatePayload);
  } catch (error) {
      console.error("Error updating product definition node:", error);
      throw error;
  }
};

/**
 * Update a node's description (alias for specific usage)
 */
export const updateNodeDescription = async (definitionId: string, nodeId: string, description: string) => {
    return updateProductDefinitionNode(definitionId, nodeId, { description });
};

/**
 * Delete a product definition
 */
export const deleteProductDefinition = async (id: string) => {
    try {
        await storage.delete(TABLE_NAME, id);
    } catch (error) {
        console.error("Error deleting product definition:", error);
        throw error;
    }
};

/**
 * Rename a product definition
 */
export const renameProductDefinition = async (id: string, newTitle: string): Promise<void> => {
    try {
        await storage.update(TABLE_NAME, id, {
            title: newTitle,
            lastModified: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error renaming product definition:", error);
        throw error;
    }
};
