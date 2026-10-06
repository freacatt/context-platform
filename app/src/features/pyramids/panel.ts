import type { PanelistConfig } from '@shared/pyramid/types';

/** Drops blank rows and empty optional fields before saving. */
export const cleanPanel = (panel: PanelistConfig[]): PanelistConfig[] =>
  panel
    .filter((p) => p.model.trim())
    .map((p) => ({
      model: p.model.trim(),
      ...(p.name?.trim() && { name: p.name.trim() }),
      ...(p.systemPrompt?.trim() && { systemPrompt: p.systemPrompt.trim() }),
      ...(p.promptMode && { promptMode: p.promptMode }),
      ...(p.temperature !== undefined && { temperature: p.temperature }),
      ...(p.maxTokens !== undefined && { maxTokens: p.maxTokens }),
    }));
