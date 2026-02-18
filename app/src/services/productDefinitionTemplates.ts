import { ProductDefinitionNode } from '../types';

export interface ProductDefinitionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tagline?: string;
  data: Record<string, ProductDefinitionNode>;
}

export const DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID = 'classic-product-definition';
export const SHAPE_UP_METHOD_TEMPLATE_ID = 'shape-up-methodology';
export const BLANK_PRODUCT_DEFINITION_TEMPLATE_ID = 'blank-product-definition';

const classicTemplateData: Record<string, ProductDefinitionNode> = {
  root: {
    id: 'root',
    label: 'Product Definition',
    type: 'root',
    description: '',
    children: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  },
  '1': { id: '1', label: '1. Product Overview', parent: 'root', children: ['1-1', '1-2'] },
  '1-1': { id: '1-1', label: 'Product Summary', question: 'What is this product in one or two sentences?', parent: '1', description: '' },
  '1-2': { id: '1-2', label: 'Background & Motivation', question: 'Why are we building this now?', parent: '1', description: '' },

  '2': { id: '2', label: '2. Target Users', parent: 'root', children: ['2-1', '2-2', '2-3'] },
  '2-1': { id: '2-1', label: 'Primary Personas', question: 'Who are the main users?', parent: '2', description: '' },
  '2-2': { id: '2-2', label: 'Secondary Personas', question: 'Are there secondary users or stakeholders?', parent: '2', description: '' },
  '2-3': { id: '2-3', label: 'User Environment', question: 'In what context do they use this product?', parent: '2', description: '' },

  '3': { id: '3', label: '3. Problem', parent: 'root', children: ['3-1', '3-2', '3-3'] },
  '3-1': { id: '3-1', label: 'Current Pain', question: 'What problem or friction do users experience today?', parent: '3', description: '' },
  '3-2': { id: '3-2', label: 'Root Causes', question: 'What are the underlying causes of this problem?', parent: '3', description: '' },
  '3-3': { id: '3-3', label: 'Existing Alternatives', question: 'How is the problem solved today?', parent: '3', description: '' },

  '4': { id: '4', label: '4. Outcomes & Success Metrics', parent: 'root', children: ['4-1', '4-2', '4-3'] },
  '4-1': { id: '4-1', label: 'User Outcomes', question: 'What changes for users when this works?', parent: '4', description: '' },
  '4-2': { id: '4-2', label: 'Business Outcomes', question: 'What business results are we aiming for?', parent: '4', description: '' },
  '4-3': { id: '4-3', label: 'KPIs & Signals', question: 'How will we measure success?', parent: '4', description: '' },

  '5': { id: '5', label: '5. Value Proposition', parent: 'root', children: ['5-1', '5-2'] },
  '5-1': { id: '5-1', label: 'Core Value', question: 'Why will users care about this product?', parent: '5', description: '' },
  '5-2': { id: '5-2', label: 'Differentiation', question: 'How is this better or different from alternatives?', parent: '5', description: '' },

  '6': { id: '6', label: '6. Scope & Features', parent: 'root', children: ['6-1', '6-2', '6-3'] },
  '6-1': { id: '6-1', label: 'Must-Have Capabilities', question: 'What must be included in the first release?', parent: '6', description: '' },
  '6-2': { id: '6-2', label: 'Nice-to-Have Capabilities', question: 'What is optional or can come later?', parent: '6', description: '' },
  '6-3': { id: '6-3', label: 'Out of Scope', question: 'What are we explicitly not doing?', parent: '6', description: '' },

  '7': { id: '7', label: '7. User Experience & Flows', parent: 'root', children: ['7-1', '7-2', '7-3'] },
  '7-1': { id: '7-1', label: 'Key Journeys', question: 'What are the main user journeys or scenarios?', parent: '7', description: '' },
  '7-2': { id: '7-2', label: 'Information Architecture', question: 'How is information organized and discovered?', parent: '7', description: '' },
  '7-3': { id: '7-3', label: 'Accessibility & Usability', question: 'What UX and accessibility considerations matter most?', parent: '7', description: '' },

  '8': { id: '8', label: '8. Technical Approach', parent: 'root', children: ['8-1', '8-2', '8-3'] },
  '8-1': { id: '8-1', label: 'Architecture Overview', question: 'What is the high-level technical approach?', parent: '8', description: '' },
  '8-2': { id: '8-2', label: 'Integrations & Dependencies', question: 'What systems or APIs does this depend on?', parent: '8', description: '' },
  '8-3': { id: '8-3', label: 'Constraints', question: 'What technical or policy constraints apply?', parent: '8', description: '' },

  '9': { id: '9', label: '9. Risks & Assumptions', parent: 'root', children: ['9-1', '9-2', '9-3'] },
  '9-1': { id: '9-1', label: 'Key Risks', question: 'What could cause this to fail?', parent: '9', description: '' },
  '9-2': { id: '9-2', label: 'Mitigations', question: 'How will we reduce or manage these risks?', parent: '9', description: '' },
  '9-3': { id: '9-3', label: 'Assumptions', question: 'What assumptions are we making that must hold true?', parent: '9', description: '' },

  '10': { id: '10', label: '10. Delivery & Lifecycle', parent: 'root', children: ['10-1', '10-2', '10-3'] },
  '10-1': { id: '10-1', label: 'Release Strategy', question: 'How will we roll this out to users?', parent: '10', description: '' },
  '10-2': { id: '10-2', label: 'Support & Operations', question: 'Who owns support and ongoing operations?', parent: '10', description: '' },
  '10-3': { id: '10-3', label: 'Evolution & Sunsetting', question: 'How might this evolve or eventually be retired?', parent: '10', description: '' },
};

const shapeUpTemplateData: Record<string, ProductDefinitionNode> = {
  root: {
    id: 'root',
    label: 'Shape Up Methodology',
    type: 'root',
    description: 'Appetite-driven product development with shaping before betting and fixed 6-week cycles.',
    children: ['1', '2', '3', '4', '5', '6'],
  },
  '1': { id: '1', label: '1. Shaping Phase', parent: 'root', children: ['1-1', '1-2', '1-3', '1-4'] },
  '1-1': { id: '1-1', label: 'Problem Framing', parent: '1', children: ['1-1-1', '1-1-2', '1-1-3'] },
  '1-1-1': { id: '1-1-1', label: 'Problem Definition', question: 'What is the core problem?', parent: '1-1', description: 'Clear articulation of the customer or business pain.' },
  '1-1-2': { id: '1-1-2', label: 'Context', question: 'Why does this matter now?', parent: '1-1', description: 'Strategic importance and timing.' },
  '1-1-3': { id: '1-1-3', label: 'Constraints', question: 'What constraints exist?', parent: '1-1', description: 'Technical, business, or policy limitations.' },
  '1-2': { id: '1-2', label: 'Solution Shaping', parent: '1', children: ['1-2-1', '1-2-2', '1-2-3'] },
  '1-2-1': { id: '1-2-1', label: 'Breadboarding', question: 'What are the key elements and flows?', parent: '1-2', description: 'Abstract flow without UI detail.' },
  '1-2-2': { id: '1-2-2', label: 'Fat Marker Sketches', question: 'What does the rough interface look like?', parent: '1-2', description: 'Low-fidelity solution sketch.' },
  '1-2-3': { id: '1-2-3', label: 'Scope Boundaries', question: 'Where are the edges of the solution?', parent: '1-2', description: 'Clear in/out definitions.' },
  '1-3': { id: '1-3', label: 'Risk Assessment', parent: '1', children: ['1-3-1', '1-3-2', '1-3-3'] },
  '1-3-1': { id: '1-3-1', label: 'Rabbit Holes', question: 'What could derail this?', parent: '1-3', description: 'Identify risky unknowns.' },
  '1-3-2': { id: '1-3-2', label: 'No-Gos', question: 'What should we explicitly avoid?', parent: '1-3', description: 'Define anti-goals.' },
  '1-3-3': { id: '1-3-3', label: 'Trade-offs', question: 'What trade-offs are accepted?', parent: '1-3', description: 'Scope flexibility instead of time flexibility.' },
  '1-4': { id: '1-4', label: 'Pitch Document', parent: '1', children: ['1-4-1', '1-4-2', '1-4-3'] },
  '1-4-1': { id: '1-4-1', label: 'Problem Section', question: 'Is the problem clearly articulated?', parent: '1-4', description: '' },
  '1-4-2': { id: '1-4-2', label: 'Solution Outline', question: 'Is the solution bounded but flexible?', parent: '1-4', description: '' },
  '1-4-3': { id: '1-4-3', label: 'Appetite', question: 'How much time are we willing to bet?', parent: '1-4', description: 'Typically 6 weeks.' },
  '2': { id: '2', label: '2. Betting Phase', parent: 'root', children: ['2-1', '2-2', '2-3'] },
  '2-1': { id: '2-1', label: 'Betting Table', parent: '2', children: ['2-1-1', '2-1-2'] },
  '2-1-1': { id: '2-1-1', label: 'Commit or Not', question: 'Do we bet on this pitch?', parent: '2-1', description: 'Leadership decides.' },
  '2-1-2': { id: '2-1-2', label: 'Kill or Archive', question: 'If not now, discard or revisit later?', parent: '2-1', description: '' },
  '2-2': { id: '2-2', label: 'Team Assignment', parent: '2', children: ['2-2-1', '2-2-2'] },
  '2-2-1': { id: '2-2-1', label: 'Small Team', question: 'Who owns this bet?', parent: '2-2', description: 'Dedicated team for 6 weeks.' },
  '2-2-2': { id: '2-2-2', label: 'Autonomy', question: 'Does the team have full execution authority?', parent: '2-2', description: 'No micromanagement.' },
  '2-3': { id: '2-3', label: 'Cycle Commitment', parent: '2', children: ['2-3-1', '2-3-2'] },
  '2-3-1': { id: '2-3-1', label: 'Fixed Time', question: 'Is time fixed?', parent: '2-3', description: 'Scope is variable.' },
  '2-3-2': { id: '2-3-2', label: 'No Interruptions', question: 'Are teams protected from scope creep?', parent: '2-3', description: '' },
  '3': { id: '3', label: '3. Build Cycle (6 Weeks)', parent: 'root', children: ['3-1', '3-2', '3-3'] },
  '3-1': { id: '3-1', label: 'Execution', parent: '3', children: ['3-1-1', '3-1-2'] },
  '3-1-1': { id: '3-1-1', label: 'Scope Hammering', question: 'Can scope be reduced if needed?', parent: '3-1', description: 'Protect the appetite.' },
  '3-1-2': { id: '3-1-2', label: 'End-to-End Ownership', question: 'Does the team own full delivery?', parent: '3-1', description: '' },
  '3-2': { id: '3-2', label: 'Progress Tracking', parent: '3', children: ['3-2-1', '3-2-2'] },
  '3-2-1': { id: '3-2-1', label: 'Hill Chart', question: 'Is progress visible?', parent: '3-2', description: 'Unknown → Known → Done.' },
  '3-2-2': { id: '3-2-2', label: 'Risk Movement', question: 'Are unknowns decreasing?', parent: '3-2', description: '' },
  '3-3': { id: '3-3', label: 'Delivery', parent: '3', children: ['3-3-1', '3-3-2'] },
  '3-3-1': { id: '3-3-1', label: 'Completed Work', question: 'Is the feature fully shipped?', parent: '3-3', description: '' },
  '3-3-2': { id: '3-3-2', label: 'No Partial Credit', question: 'Is incomplete work avoided?', parent: '3-3', description: '' },
  '4': { id: '4', label: '4. Cool-Down Period', parent: 'root', children: ['4-1', '4-2'] },
  '4-1': { id: '4-1', label: 'Bug Fixing', parent: '4', children: ['4-1-1'] },
  '4-1-1': { id: '4-1-1', label: 'Stability', question: 'Are loose ends resolved?', parent: '4-1', description: '' },
  '4-2': { id: '4-2', label: 'Exploration', parent: '4', children: ['4-2-1'] },
  '4-2-1': { id: '4-2-1', label: 'New Ideas', question: 'What should be shaped next?', parent: '4-2', description: '' },
  '5': { id: '5', label: '5. No Backlog Philosophy', parent: 'root', children: ['5-1', '5-2'] },
  '5-1': { id: '5-1', label: 'No Endless Queue', parent: '5', children: ['5-1-1'] },
  '5-1-1': { id: '5-1-1', label: 'Discard by Default', question: 'Are ideas discarded unless shaped?', parent: '5-1', description: '' },
  '5-2': { id: '5-2', label: 'Idea Lifecycle', parent: '5', children: ['5-2-1'] },
  '5-2-1': { id: '5-2-1', label: 'Shape Before Commitment', question: 'Is every idea shaped before betting?', parent: '5-2', description: '' },
  '6': { id: '6', label: '6. Continuous Loop', parent: 'root', children: ['6-1'] },
  '6-1': { id: '6-1', label: 'Next Betting Cycle', question: 'What do we bet on next?', parent: '6', description: 'Return to shaping phase.' },
};

const blankTemplateData: Record<string, ProductDefinitionNode> = {
  root: {
    id: 'root',
    label: 'Blank Product Definition',
    type: 'root',
    description: '',
    children: [],
  },
};

export const PRODUCT_DEFINITION_TEMPLATES: ProductDefinitionTemplate[] = [
  {
    id: DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID,
    name: 'Classic Product Definition',
    description: 'Structured 8-section tree covering problem, solution, risks, implementation, and lifecycle.',
    category: 'General',
    tagline: 'Best for first-time structured product shaping.',
    data: classicTemplateData,
  },
  {
    id: SHAPE_UP_METHOD_TEMPLATE_ID,
    name: 'Shape Up Methodology',
    description: 'Shape Up flavor including shaping, betting, 6-week cycles, cool-down, and no-backlog.',
    category: 'Methodology',
    tagline: 'When you want to run full Shape Up end to end.',
    data: shapeUpTemplateData,
  },
  {
    id: BLANK_PRODUCT_DEFINITION_TEMPLATE_ID,
    name: 'Blank Diagram',
    description: 'Empty canvas with only a root node so you can shape everything yourself.',
    category: 'Blank',
    tagline: 'Pure canvas; you bring the structure.',
    data: blankTemplateData,
  },
];

export const getProductDefinitionTemplateById = (id: string): ProductDefinitionTemplate | undefined =>
  PRODUCT_DEFINITION_TEMPLATES.find((t) => t.id === id);
