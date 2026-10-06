import { api } from '../../../convex/_generated/api';

/** Apps stored as `{ title, spec }` (Product Definition included); their functions share one shape. */
export const SPEC_API = {
  productDefinitions: api.productDefinitions,
  technicalArchitectures: api.technicalArchitectures,
  designSystems: api.designSystems,
  technicalPlans: api.technicalPlans,
  decisions: api.decisions,
  glossaries: api.glossaries,
  researchStudies: api.researchStudies,
  roadmaps: api.roadmaps,
};
export type SpecAppKey = keyof typeof SPEC_API;
