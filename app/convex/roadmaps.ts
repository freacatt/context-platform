import { createDefaultRoadmap, normalizeRoadmap } from '../shared/specs/roadmap';
import { specDocFunctions } from './lib/specDocs';

export const { list, get, create, rename, update, duplicate, remove } = specDocFunctions('roadmaps', {
  what: 'Roadmap',
  normalize: normalizeRoadmap,
  initial: createDefaultRoadmap,
});
