import { storage } from './storage';
import { ProductDefinition, ProductDefinitionNode } from '../types';

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
 * Create a new product definition with the default template
 */
export const createProductDefinition = async (userId: string, title: string = "New Product Definition", workspaceId?: string): Promise<string | null> => {
  if (!userId) return null;

  const id = storage.createId();
  const newDoc = {
    id,
    userId: userId,
    workspaceId: workspaceId || null,
    title,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    linkedPyramidId: null, 
    contextSources: [], 
    data: {
      "root": {
        id: "root",
        label: "Product Definition",
        type: "root",
        description: "",
        children: ["1", "2", "3", "4", "5", "6", "7", "8"]
      },
      "1": { id: "1", label: "1. Problem & Goals", parent: "root", children: ["1-1", "1-2", "1-3"] },
      "1-1": { id: "1-1", label: "Problem Statement", question: "What specific customer pain exists?", parent: "1", children: ["1-1-1", "1-1-2", "1-1-3"] },
        "1-1-1": { id: "1-1-1", label: "Customer Pain", question: "What specific customer pain exists?", parent: "1-1", description: "" },
        "1-1-2": { id: "1-1-2", label: "Current Workarounds", question: "What are the current workarounds users employ?", parent: "1-1", description: "" },
        "1-1-3": { id: "1-1-3", label: "Timing", question: "Why is now the right time to solve this?", parent: "1-1", description: "" },
      "1-2": { id: "1-2", label: "Investment Limits", parent: "1", children: ["1-2-1", "1-2-2", "1-2-3"] },
        "1-2-1": { id: "1-2-1", label: "Timeframe", question: "What is the expected timeframe?", parent: "1-2", description: "" },
        "1-2-2": { id: "1-2-2", label: "Resources", question: "What resources are available?", parent: "1-2", description: "" },
        "1-2-3": { id: "1-2-3", label: "Scope Flexibility", question: "Is the scope flexible or fixed?", parent: "1-2", description: "" },
      "1-3": { id: "1-3", label: "Baseline Comparison", parent: "1", children: ["1-3-1", "1-3-2", "1-3-3"] },
        "1-3-1": { id: "1-3-1", label: "Existing Solution", question: "What exists today?", parent: "1-3", description: "" },
        "1-3-2": { id: "1-3-2", label: "User Behavior", question: "How do users solve this now?", parent: "1-3", description: "" },
        "1-3-3": { id: "1-3-3", label: "Success Definition", question: "What does success look like?", parent: "1-3", description: "" },

      "2": { id: "2", label: "2. Solution Concepts", parent: "root", children: ["2-1", "2-2", "2-3"] },
        "2-1": { id: "2-1", label: "Key Flows", parent: "2", children: ["2-1-1", "2-1-2", "2-1-3"] },
          "2-1-1": { id: "2-1-1", label: "Screens/Views", question: "What places (screens/views) are involved?", parent: "2-1", description: "" },
          "2-1-2": { id: "2-1-2", label: "Actions", question: "What main actions can users take?", parent: "2-1", description: "" },
          "2-1-3": { id: "2-1-3", label: "Connections", question: "How do the flows connect?", parent: "2-1", description: "" },
        "2-2": { id: "2-2", label: "Rough Sketches", parent: "2", children: ["2-2-1", "2-2-2", "2-2-3"] },
          "2-2-1": { id: "2-2-1", label: "Concepts", question: "What are the rough visual concepts?", parent: "2-2", description: "" },
          "2-2-2": { id: "2-2-2", label: "Mockups", question: "Are there low fidelity mockups?", parent: "2-2", description: "" },
          "2-2-3": { id: "2-2-3", label: "Interactions", question: "What are the core interactions?", parent: "2-2", description: "" },
        "2-3": { id: "2-3", label: "Scope Boundaries", parent: "2", children: ["2-3-1", "2-3-2", "2-3-3"] },
          "2-3-1": { id: "2-3-1", label: "In Scope", question: "What is explicitly included?", parent: "2-3", description: "" },
          "2-3-2": { id: "2-3-2", label: "Out of Scope", question: "What is explicitly excluded?", parent: "2-3", description: "" },
          "2-3-3": { id: "2-3-3", label: "No-Go Zones", question: "Are there clear no-go zones?", parent: "2-3", description: "" },

      "3": { id: "3", label: "3. Risks & Unknowns", parent: "root", children: ["3-1", "3-2", "3-3"] },
        "3-1": { id: "3-1", label: "Technical Risks", parent: "3", children: ["3-1-1", "3-1-2", "3-1-3"] },
          "3-1-1": { id: "3-1-1", label: "New Tech", question: "Is new technology needed?", parent: "3-1", description: "" },
          "3-1-2": { id: "3-1-2", label: "Integration", question: "How complex is the integration?", parent: "3-1", description: "" },
          "3-1-3": { id: "3-1-3", label: "Performance", question: "Are there performance concerns?", parent: "3-1", description: "" },
        "3-2": { id: "3-2", label: "Design Challenges", parent: "3", children: ["3-2-1", "3-2-2", "3-2-3"] },
          "3-2-1": { id: "3-2-1", label: "UX Problems", question: "Are there unsolved UX problems?", parent: "3-2", description: "" },
          "3-2-2": { id: "3-2-2", label: "Edge Cases", question: "What are the edge cases?", parent: "3-2", description: "" },
          "3-2-3": { id: "3-2-3", label: "Devices", question: "Mobile vs desktop considerations?", parent: "3-2", description: "" },
        "3-3": { id: "3-3", label: "Risk Mitigation", parent: "3", children: ["3-3-1", "3-3-2", "3-3-3"] },
          "3-3-1": { id: "3-3-1", label: "Strategies", question: "What are the de-risking strategies?", parent: "3-3", description: "" },
          "3-3-2": { id: "3-3-2", label: "Workarounds", question: "Are there temporary workarounds?", parent: "3-3", description: "" },
          "3-3-3": { id: "3-3-3", label: "Decisions", question: "What are the hard decisions made?", parent: "3-3", description: "" },

      "4": { id: "4", label: "4. Implementation Strategy", parent: "root", children: ["4-1", "4-2", "4-3"] },
        "4-1": { id: "4-1", label: "Components", parent: "4", children: ["4-1-1", "4-1-2", "4-1-3"] },
          "4-1-1": { id: "4-1-1", label: "Separation", question: "Can this be built separately?", parent: "4-1", description: "" },
          "4-1-2": { id: "4-1-2", label: "Boundaries", question: "Are there clear system boundaries?", parent: "4-1", description: "" },
          "4-1-3": { id: "4-1-3", label: "Modules", question: "What are the key modules?", parent: "4-1", description: "" },
        "4-2": { id: "4-2", label: "Complexity Analysis", parent: "4", children: ["4-2-1", "4-2-2", "4-2-3"] },
          "4-2-1": { id: "4-2-1", label: "High Complexity", question: "What is the most complex part?", parent: "4-2", description: "" },
          "4-2-2": { id: "4-2-2", label: "Low Complexity", question: "What is straightforward?", parent: "4-2", description: "" },
          "4-2-3": { id: "4-2-3", label: "Sequencing", question: "How do we sequence development?", parent: "4-2", description: "" },
        "4-3": { id: "4-3", label: "Milestones", parent: "4", children: ["4-3-1", "4-3-2", "4-3-3"] },
          "4-3-1": { id: "4-3-1", label: "Vertical Slice", question: "Can we ship a vertical slice?", parent: "4-3", description: "" },
          "4-3-2": { id: "4-3-2", label: "End-to-End", question: "Are there end-to-end pieces?", parent: "4-3", description: "" },
          "4-3-3": { id: "4-3-3", label: "MVP", question: "What constitutes the MVP?", parent: "4-3", description: "" },

      "5": { id: "5", label: "5. Success Metrics", parent: "root", children: ["5-1", "5-2", "5-3", "5-4"] },
        "5-1": { id: "5-1", label: "Impact", parent: "5", children: ["5-1-1", "5-1-2", "5-1-3"] },
          "5-1-1": { id: "5-1-1", label: "Customer Value", question: "What value does the customer get?", parent: "5-1", description: "" },
          "5-1-2": { id: "5-1-2", label: "Business Value", question: "What is the business value?", parent: "5-1", description: "" },
          "5-1-3": { id: "5-1-3", label: "KPIs", question: "What KPIs will we measure?", parent: "5-1", description: "" },
        "5-2": { id: "5-2", label: "Feasibility", parent: "5", children: ["5-2-1", "5-2-2", "5-2-3"] },
          "5-2-1": { id: "5-2-1", label: "ROI", question: "Is the ROI positive?", parent: "5-2", description: "" },
          "5-2-2": { id: "5-2-2", label: "Resources", question: "Are resources available?", parent: "5-2", description: "" },
          "5-2-3": { id: "5-2-3", label: "Timing", question: "Is the strategic timing right?", parent: "5-2", description: "" },
        "5-3": { id: "5-3", label: "Strategic Fit", parent: "5", children: ["5-3-1", "5-3-2", "5-3-3"] },
          "5-3-1": { id: "5-3-1", label: "Product Fit", question: "Does it fit the existing product?", parent: "5-3", description: "" },
          "5-3-2": { id: "5-3-2", label: "Differentiation", question: "What is the differentiation value?", parent: "5-3", description: "" },
          "5-3-3": { id: "5-3-3", label: "Trade-offs", question: "Are the trade-offs acceptable?", parent: "5-3", description: "" },
        "5-4": { id: "5-4", label: "Readiness", parent: "5", children: ["5-4-1", "5-4-2", "5-4-3"] },
          "5-4-1": { id: "5-4-1", label: "Capability", question: "Does the team have the capability?", parent: "5-4", description: "" },
          "5-4-2": { id: "5-4-2", label: "Technical Feasibility", question: "Is it technically feasible?", parent: "5-4", description: "" },
          "5-4-3": { id: "5-4-3", label: "Market Readiness", question: "Is the market ready?", parent: "5-4", description: "" },

      "6": { id: "6", label: "6. Delivery Constraints", parent: "root", children: ["6-1", "6-2", "6-3"] },
        "6-1": { id: "6-1", label: "Timeline", parent: "6", children: ["6-1-1", "6-1-2", "6-1-3"] },
          "6-1-1": { id: "6-1-1", label: "Hard Stop", question: "Is there a hard deadline?", parent: "6-1", description: "" },
          "6-1-2": { id: "6-1-2", label: "Flexibility", question: "Is the timeline flexible?", parent: "6-1", description: "" },
          "6-1-3": { id: "6-1-3", label: "Key Dates", question: "What are the key dates?", parent: "6-1", description: "" },
        "6-2": { id: "6-2", label: "Prioritization", parent: "6", children: ["6-2-1", "6-2-2", "6-2-3"] },
          "6-2-1": { id: "6-2-1", label: "Must Have", question: "What is core functionality?", parent: "6-2", description: "" },
          "6-2-2": { id: "6-2-2", label: "Nice to Have", question: "What is optional?", parent: "6-2", description: "" },
          "6-2-3": { id: "6-2-3", label: "Cuts", question: "What can be cut if needed?", parent: "6-2", description: "" },
        "6-3": { id: "6-3", label: "Quality Standards", parent: "6", children: ["6-3-1", "6-3-2", "6-3-3"] },
          "6-3-1": { id: "6-3-1", label: "Performance", question: "What are the performance standards?", parent: "6-3", description: "" },
          "6-3-2": { id: "6-3-2", label: "Reliability", question: "What are the reliability targets?", parent: "6-3", description: "" },
          "6-3-3": { id: "6-3-3", label: "Testing", question: "What is the testing strategy?", parent: "6-3", description: "" },

      "7": { id: "7", label: "7. Execution Plan", parent: "root", children: ["7-1", "7-2", "7-3"] },
        "7-1": { id: "7-1", label: "Phasing", parent: "7", children: ["7-1-1", "7-1-2", "7-1-3"] },
          "7-1-1": { id: "7-1-1", label: "Phase 1", question: "What is in Phase 1?", parent: "7-1", description: "" },
          "7-1-2": { id: "7-1-2", label: "Phase 2", question: "What is in Phase 2?", parent: "7-1", description: "" },
          "7-1-3": { id: "7-1-3", label: "Future", question: "What is for future consideration?", parent: "7-1", description: "" },
        "7-2": { id: "7-2", label: "Team", parent: "7", children: ["7-2-1", "7-2-2", "7-2-3"] },
          "7-2-1": { id: "7-2-1", label: "Roles", question: "Who is doing what?", parent: "7-2", description: "" },
          "7-2-2": { id: "7-2-2", label: "Dependencies", question: "Are there external dependencies?", parent: "7-2", description: "" },
          "7-2-3": { id: "7-2-3", label: "Collaboration", question: "How will the team collaborate?", parent: "7-2", description: "" },
        "7-3": { id: "7-3", label: "Communication", parent: "7", children: ["7-3-1", "7-3-2", "7-3-3"] },
          "7-3-1": { id: "7-3-1", label: "Updates", question: "How will updates be shared?", parent: "7-3", description: "" },
          "7-3-2": { id: "7-3-2", label: "Stakeholders", question: "Who needs to be informed?", parent: "7-3", description: "" },
          "7-3-3": { id: "7-3-3", label: "Documentation", question: "Where will documentation live?", parent: "7-3", description: "" },

      "8": { id: "8", label: "8. Lifecycle", parent: "root", children: ["8-1", "8-2", "8-3"] },
        "8-1": { id: "8-1", label: "Development", parent: "8", children: ["8-1-1", "8-1-2", "8-1-3"] },
          "8-1-1": { id: "8-1-1", label: "Prototyping", question: "Are we prototyping first?", parent: "8-1", description: "" },
          "8-1-2": { id: "8-1-2", label: "Alpha/Beta", question: "Will there be an alpha/beta?", parent: "8-1", description: "" },
          "8-1-3": { id: "8-1-3", label: "Launch", question: "What is the launch plan?", parent: "8-1", description: "" },
        "8-2": { id: "8-2", label: "Maintenance", parent: "8", children: ["8-2-1", "8-2-2", "8-2-3"] },
          "8-2-1": { id: "8-2-1", label: "Support", question: "Who will support this?", parent: "8-2", description: "" },
          "8-2-2": { id: "8-2-2", label: "Updates", question: "How often will we update?", parent: "8-2", description: "" },
          "8-2-3": { id: "8-2-3", label: "Monitoring", question: "What will we monitor?", parent: "8-2", description: "" },
        "8-3": { id: "8-3", label: "Retirement", parent: "8", children: ["8-3-1", "8-3-2", "8-3-3"] },
          "8-3-1": { id: "8-3-1", label: "End of Life", question: "When does this retire?", parent: "8-3", description: "" },
          "8-3-2": { id: "8-3-2", label: "Migration", question: "Is there a migration path?", parent: "8-3", description: "" },
          "8-3-3": { id: "8-3-3", label: "Lessons", question: "How do we capture lessons?", parent: "8-3", description: "" }
    }
  };

  try {
      await storage.save(TABLE_NAME, newDoc);
      return id;
  } catch (error) {
      console.error("Error creating product definition:", error);
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
