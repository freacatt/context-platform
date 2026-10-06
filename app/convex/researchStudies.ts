import { createDefaultResearch, normalizeResearch } from '../shared/specs/research';
import { specDocFunctions } from './lib/specDocs';

export const { list, get, create, rename, update, duplicate, remove } = specDocFunctions('researchStudies', {
  what: 'Research study',
  normalize: normalizeResearch,
  initial: createDefaultResearch,
});
