import { defineSchema, defineTable } from 'convex/server';
import { authTables } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { KNOWLEDGE_APP_KEYS, LINK_KINDS } from '../shared/knowledge/types';

/** Fields shared by every document that lives inside a workspace. */
const workspaceDoc = {
  workspaceId: v.id('workspaces'),
  title: v.string(),
  updatedAt: v.number(),
};

// --- AI & Pyramid Solver -------------------------------------------------------------

export const panelistValidator = v.object({
  model: v.string(),
  name: v.optional(v.string()),
  systemPrompt: v.optional(v.string()),
  promptMode: v.optional(v.union(v.literal('append'), v.literal('replace'))),
  temperature: v.optional(v.number()),
  maxTokens: v.optional(v.number()),
});

export const hostValidator = v.object({
  model: v.string(),
  systemPrompt: v.optional(v.string()),
  temperature: v.optional(v.number()),
  maxTokens: v.optional(v.number()),
});

export const knowledgeAppValidator = v.union(...KNOWLEDGE_APP_KEYS.map((key) => v.literal(key)));

/** Mirrors `ContextRef` (shared/pyramid/types.ts). */
export const contextRefValidator = v.union(
  v.object({ kind: v.literal('item'), app: knowledgeAppValidator, id: v.string() }),
  v.object({ kind: v.literal('pack'), id: v.string() }),
  v.object({ kind: v.literal('file'), id: v.string() }),
);

/** Mirrors `PyramidConfig` (shared/pyramid/types.ts). */
export const pyramidConfigValidator = v.object({
  question: v.string(),
  context: v.string(),
  /** Legacy; folded into `contextRefs` when the setup is saved. */
  contextDocumentIds: v.array(v.id('contextDocuments')),
  contextRefs: v.optional(v.array(contextRefValidator)),
  contextLinkDepth: v.optional(v.number()),
  boardSize: v.number(),
  panel: v.array(panelistValidator),
  host: hostValidator,
  critiqueRound: v.boolean(),
  autoApprove: v.boolean(),
  minPanelists: v.number(),
  defaultSystemPrompt: v.optional(v.string()),
});

export const pyramidStatusValidator = v.union(
  v.literal('draft'),
  v.literal('estimated'),
  v.literal('running'),
  v.literal('awaiting_approval'),
  v.literal('paused_budget'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('cancelled'),
);

/** Amounts are decimal USD strings (shared/pyramid/money.ts). */
export const costEstimateValidator = v.object({
  low: v.string(),
  expected: v.string(),
  high: v.string(),
  calls: v.record(v.string(), v.number()),
  perModel: v.record(v.string(), v.string()),
});

/** Mirrors `HostCell`. */
export const hostCellValidator = v.object({
  label: v.string(),
  combinedQuestion: v.union(v.string(), v.null()),
  conclusion: v.string(),
  dissent: v.array(v.string()),
  confidence: v.number(),
  nextQuestion: v.union(v.string(), v.null()),
  summary: v.string(),
  primaryParent: v.union(v.string(), v.null()),
});

export const chatMessageValidator = v.object({
  role: v.union(v.literal('system'), v.literal('user'), v.literal('assistant')),
  content: v.string(),
});

export const productDefinitionNodeValidator = v.object({
  id: v.string(),
  label: v.string(),
  type: v.optional(v.string()),
  description: v.optional(v.string()),
  question: v.optional(v.string()),
  parent: v.optional(v.string()),
  children: v.optional(v.array(v.string())),
});

// --- Knowledge ----------------------------------------------------------------------------

export const linkKindValidator = v.union(...LINK_KINDS.map((kind) => v.literal(kind)));

/** Mirrors `KnowledgeRef` (shared/knowledge/types.ts). */
export const knowledgeRefValidator = v.object({
  app: knowledgeAppValidator,
  id: v.string(),
  anchor: v.optional(v.string()),
});

export const taskTypeValidator = v.union(v.literal('NEW_TASK'), v.literal('FIX_TASK'));

export default defineSchema({
  ...authTables,

  workspaces: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    updatedAt: v.number(),
  }).index('by_owner', ['ownerId']),

  /** A Pyramid Solver run: setup, status, spend. Cells and calls live in their own tables. */
  pyramids: defineTable({
    ...workspaceDoc,
    config: pyramidConfigValidator,
    status: pyramidStatusValidator,
    /** Last committed row (0 = none yet). */
    currentRow: v.number(),
    /** Decimal USD; set when the run is confirmed. */
    budgetCap: v.optional(v.string()),
    /** Decimal USD: the sum of every call's cost. */
    spent: v.string(),
    estimate: v.optional(costEstimateValidator),
    /** The host's compressed context, written once per run. */
    brief: v.optional(v.string()),
    error: v.optional(v.string()),
    /** Failed panelists per committed row. */
    rowResults: v.array(v.object({ row: v.number(), failedPanelists: v.array(v.string()), committedAt: v.number() })),
    /** Changes on every start/resume; a runner whose id no longer matches stops. */
    executionId: v.optional(v.string()),
  }).index('by_workspace', ['workspaceId']),

  /** One concluded cell. `cell.nextQuestion` is the effective one (a checkpoint edit wins). */
  pyramidCells: defineTable({
    workspaceId: v.id('workspaces'),
    pyramidId: v.id('pyramids'),
    label: v.string(),
    row: v.number(),
    cell: hostCellValidator,
    /** What the host proposed, kept when the user edited the next question. */
    originalNextQuestion: v.optional(v.union(v.string(), v.null())),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_pyramid', ['pyramidId', 'row']),

  /** Text files uploaded as context of one pyramid (private to it). */
  pyramidFiles: defineTable({
    ...workspaceDoc,
    pyramidId: v.id('pyramids'),
    content: v.string(),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_pyramid', ['pyramidId']),

  /** Every provider attempt of a run, append-only (audit trail + transcripts). */
  pyramidCalls: defineTable({
    workspaceId: v.id('workspaces'),
    pyramidId: v.id('pyramids'),
    row: v.number(),
    role: v.union(v.literal('brief'), v.literal('panel'), v.literal('critique'), v.literal('host')),
    model: v.string(),
    panelist: v.union(v.string(), v.null()),
    messages: v.array(chatMessageValidator),
    output: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    cost: v.string(),
    status: v.union(v.literal('ok'), v.literal('error'), v.literal('invalid')),
    startedAt: v.number(),
    endedAt: v.number(),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_pyramid', ['pyramidId', 'row']),

  /** `spec` is a `ProductSpec` (shared/specs/productSpec.ts). `data` is the previous mind-map version, read until the spec is first saved. */
  productDefinitions: defineTable({
    ...workspaceDoc,
    spec: v.optional(v.any()),
    data: v.optional(v.record(v.string(), productDefinitionNodeValidator)),
  }).index('by_workspace', ['workspaceId']),

  // --- Spec documents: `spec` is editor-owned JSON normalized by shared/specs (see convex/lib/specDocs.ts).
  designSystems: defineTable({ ...workspaceDoc, spec: v.any() }).index('by_workspace', ['workspaceId']),
  technicalPlans: defineTable({ ...workspaceDoc, spec: v.any() }).index('by_workspace', ['workspaceId']),
  decisions: defineTable({ ...workspaceDoc, spec: v.any() }).index('by_workspace', ['workspaceId']),
  glossaries: defineTable({ ...workspaceDoc, spec: v.any() }).index('by_workspace', ['workspaceId']),
  researchStudies: defineTable({ ...workspaceDoc, spec: v.any() }).index('by_workspace', ['workspaceId']),
  roadmaps: defineTable({ ...workspaceDoc, spec: v.any() }).index('by_workspace', ['workspaceId']),

  directories: defineTable(workspaceDoc).index('by_workspace', ['workspaceId']),

  contextDocuments: defineTable({
    ...workspaceDoc,
    type: v.string(),
    content: v.string(),
    directoryId: v.optional(v.id('directories')),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_directory', ['directoryId']),

  diagrams: defineTable({
    ...workspaceDoc,
    // React Flow nodes/edges: free-form editor state.
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
  }).index('by_workspace', ['workspaceId']),

  // Sections are deep, editor-owned JSON; their TypeScript shapes live in shared/types.
  /**
   * `spec` is a `TechnicalArchitectureSpec` (shared/specs/technicalArchitecture.ts). The fixed
   * sections are the previous version, read as a spec until the first save clears them.
   */
  technicalArchitectures: defineTable({
    ...workspaceDoc,
    spec: v.optional(v.any()),
    metadata: v.optional(v.any()),
    system_architecture: v.optional(v.any()),
    technology_stack: v.optional(v.any()),
    code_organization: v.optional(v.any()),
    design_patterns: v.optional(v.any()),
    api_standards: v.optional(v.any()),
    security_standards: v.optional(v.any()),
    performance_standards: v.optional(v.any()),
    testing_standards: v.optional(v.any()),
    deployment_cicd: v.optional(v.any()),
    preservation_rules: v.optional(v.any()),
    ai_development_instructions: v.optional(v.any()),
  }).index('by_workspace', ['workspaceId']),

  uiUxArchitectures: defineTable({
    ...workspaceDoc,
    ui_ux_architecture_metadata: v.any(),
    /** The design system the screens are built with (theme and components live there). */
    designSystemId: v.optional(v.id('designSystems')),
    /** Legacy: moved into a design system with `extractDesignSystem`. */
    theme_specification: v.optional(v.any()),
    base_components: v.optional(v.array(v.any())),
    pages: v.array(v.any()),
    ux_patterns: v.any(),
  }).index('by_workspace', ['workspaceId']),

  /** Legacy (Technical Tasks, replaced by Technical Plans): read until converted, never created. */
  pipelines: defineTable({
    workspaceId: v.id('workspaces'),
    title: v.string(),
    order: v.number(),
  }).index('by_workspace', ['workspaceId']),

  /** Legacy, see `pipelines`. `technicalPlans.convertLegacyTasks` turns them into plans. */
  technicalTasks: defineTable({
    ...workspaceDoc,
    pipelineId: v.id('pipelines'),
    type: taskTypeValidator,
    technicalArchitectureId: v.optional(v.id('technicalArchitectures')),
    order: v.number(),
    data: v.any(),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_pipeline', ['pipelineId']),

  /**
   * A typed, directed relation between two items of one workspace. Ids are strings because an
   * end can be in any knowledge app's table; every write normalizes and ownership-checks them.
   */
  links: defineTable({
    workspaceId: v.id('workspaces'),
    fromApp: knowledgeAppValidator,
    fromId: v.string(),
    toApp: knowledgeAppValidator,
    toId: v.string(),
    kind: linkKindValidator,
    createdAt: v.number(),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_from', ['fromId'])
    .index('by_to', ['toId']),

  /** A saved selection of knowledge items (export, and later AI context). */
  contextPacks: defineTable({
    ...workspaceDoc,
    refs: v.array(knowledgeRefValidator),
    /** Link depth to expand the selection by; -1 = all. */
    linkDepth: v.number(),
  }).index('by_workspace', ['workspaceId']),

  // --- Per-user settings (not workspace data) ------------------------------------------

  /** AI settings of one user. The API key is never returned to the browser. */
  aiSettings: defineTable({
    userId: v.id('users'),
    openRouterApiKey: v.optional(v.string()),
    /** Model used by AI features when they do not choose one. */
    defaultModel: v.optional(v.string()),
    /** Panel and host new pyramids start with. */
    defaultPanel: v.optional(v.array(panelistValidator)),
    defaultHost: v.optional(hostValidator),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  /** Saved panel + host + prompts, reusable for any pyramid. */
  pyramidPresets: defineTable({
    userId: v.id('users'),
    name: v.string(),
    panel: v.array(panelistValidator),
    host: hostValidator,
    defaultSystemPrompt: v.optional(v.string()),
    critiqueRound: v.boolean(),
    updatedAt: v.number(),
  }).index('by_user', ['userId', 'name']),

  /** The OpenRouter model catalog (public data), refreshed at most once a day. */
  aiModelCache: defineTable({
    fetchedAt: v.number(),
    models: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.number(),
        promptPrice: v.string(),
        completionPrice: v.string(),
      }),
    ),
  }),
});
