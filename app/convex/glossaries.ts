import { createDefaultGlossary, normalizeGlossary } from '../shared/specs/glossary';
import { specDocFunctions } from './lib/specDocs';

export const { list, get, create, rename, update, duplicate, remove } = specDocFunctions('glossaries', {
  what: 'Glossary',
  normalize: normalizeGlossary,
  initial: createDefaultGlossary,
});
