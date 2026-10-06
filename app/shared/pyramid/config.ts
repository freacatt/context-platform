/** Run configuration: defaults and validation (the server applies both). */
import { MAX_BOARD_SIZE, MIN_BOARD_SIZE } from './board';
import { displayName, type ContextRef, type HostConfig, type PanelistConfig, type PyramidConfig } from './types';

export const QUESTION_MIN = 10;
export const QUESTION_MAX = 4000;
export const MAX_PANELISTS = 6;
export const PROMPT_MAX = 8000;
export const CONTEXT_MAX_CHARS = 400_000;
/** Everything the brief reads (note + every source), ≈ 150k tokens. */
export const RAW_CONTEXT_MAX_CHARS = 600_000;
export const MAX_CONTEXT_REFS = 100;
/** New pyramids start small (6 working rows): cheap to try, raise it for depth. */
export const NEW_PYRAMID_BOARD_SIZE = 4;

export const PANELIST_DEFAULTS = { promptMode: 'append', temperature: 0.7, maxTokens: 1500 } as const;
export const HOST_DEFAULTS = { temperature: 0.3, maxTokens: 4000 } as const;

export class ConfigError extends Error {}

/** A blank setup for a new pyramid; `defaults` come from the user's AI settings. */
export function createDefaultPyramidConfig(defaults: {
  question?: string;
  panel?: PanelistConfig[];
  host?: HostConfig;
} = {}): PyramidConfig {
  return {
    question: defaults.question?.trim() ?? '',
    context: '',
    contextDocumentIds: [],
    contextRefs: [],
    contextLinkDepth: 0,
    boardSize: NEW_PYRAMID_BOARD_SIZE,
    panel: defaults.panel?.length ? defaults.panel : [{ model: '' }],
    host: defaults.host ?? { model: '' },
    critiqueRound: false,
    autoApprove: false,
    minPanelists: 1,
  };
}

const clean = (s: string | undefined) => s?.trim() || undefined;

function checkNumber(value: number | undefined, min: number, max: number, what: string, integer = false) {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new ConfigError(`${what} must be ${integer ? 'an integer ' : ''}between ${min} and ${max}`);
  }
}

function checkPrompt(prompt: string | undefined, what: string) {
  if (prompt && prompt.length > PROMPT_MAX) throw new ConfigError(`${what} is longer than ${PROMPT_MAX} characters`);
}

export function normalizePanelist(p: PanelistConfig, i: number): PanelistConfig {
  const what = `Panelist ${i + 1}`;
  const model = p.model.trim();
  if (!model) throw new ConfigError(`${what} needs a model`);
  checkNumber(p.temperature, 0, 2, `${what} temperature`);
  checkNumber(p.maxTokens, 64, 64000, `${what} max tokens`, true);
  checkPrompt(p.systemPrompt, `${what} system prompt`);
  return {
    model,
    ...(clean(p.name) && { name: clean(p.name) }),
    ...(clean(p.systemPrompt) && { systemPrompt: clean(p.systemPrompt) }),
    ...(p.promptMode && { promptMode: p.promptMode }),
    ...(p.temperature !== undefined && { temperature: p.temperature }),
    ...(p.maxTokens !== undefined && { maxTokens: p.maxTokens }),
  };
}

export function normalizeHost(h: HostConfig): HostConfig {
  const model = h.model.trim();
  if (!model) throw new ConfigError('The host needs a model');
  checkNumber(h.temperature, 0, 2, 'Host temperature');
  checkNumber(h.maxTokens, 256, 64000, 'Host max tokens', true);
  checkPrompt(h.systemPrompt, 'Host system prompt');
  return {
    model,
    ...(clean(h.systemPrompt) && { systemPrompt: clean(h.systemPrompt) }),
    ...(h.temperature !== undefined && { temperature: h.temperature }),
    ...(h.maxTokens !== undefined && { maxTokens: h.maxTokens }),
  };
}

/** Checks a panel: 1..6 unique panelists with unique display names. */
export function normalizePanel(panel: PanelistConfig[]): PanelistConfig[] {
  const out = panel.map(normalizePanelist);
  if (out.length < 1) throw new ConfigError('The panel needs at least one panelist');
  if (out.length > MAX_PANELISTS) throw new ConfigError(`The panel can have at most ${MAX_PANELISTS} panelists`);
  const names = out.map(displayName);
  if (new Set(names).size !== names.length) {
    throw new ConfigError('Panelist names must be unique; give a name to panelists sharing a model');
  }
  return out;
}

/**
 * The config a run starts with. Throws ConfigError with a user-readable message.
 * Drafts may be saved incomplete; this is applied before estimating.
 */
export function validatePyramidConfig(cfg: PyramidConfig): PyramidConfig {
  const question = cfg.question.trim();
  if (question.length < QUESTION_MIN) throw new ConfigError(`The root question needs at least ${QUESTION_MIN} characters`);
  if (question.length > QUESTION_MAX) throw new ConfigError(`The root question is longer than ${QUESTION_MAX} characters`);
  checkNumber(cfg.boardSize, MIN_BOARD_SIZE, MAX_BOARD_SIZE, 'Board size', true);
  if (cfg.context.length > CONTEXT_MAX_CHARS) throw new ConfigError(`Context is longer than ${CONTEXT_MAX_CHARS} characters`);
  const panel = normalizePanel(cfg.panel);
  checkNumber(cfg.minPanelists, 1, panel.length, 'Minimum panelists', true);
  checkPrompt(cfg.defaultSystemPrompt, 'Default system prompt');
  return {
    question,
    context: cfg.context,
    contextDocumentIds: [],
    contextRefs: contextRefsOf(cfg),
    contextLinkDepth: contextLinkDepthOf(cfg),
    boardSize: cfg.boardSize,
    panel,
    host: normalizeHost(cfg.host),
    critiqueRound: cfg.critiqueRound,
    autoApprove: cfg.autoApprove,
    minPanelists: cfg.minPanelists,
    ...(clean(cfg.defaultSystemPrompt) && { defaultSystemPrompt: clean(cfg.defaultSystemPrompt) }),
  };
}

const contextRefKey = (ref: ContextRef) => (ref.kind === 'item' ? `item:${ref.app}:${ref.id}` : `${ref.kind}:${ref.id}`);

/** Every context source of a setup, legacy document ids included, without duplicates. */
export function contextRefsOf(cfg: Pick<PyramidConfig, 'contextDocumentIds' | 'contextRefs'>): ContextRef[] {
  const refs: ContextRef[] = [
    ...cfg.contextDocumentIds.map((id): ContextRef => ({ kind: 'item', app: 'contextDocuments', id })),
    ...(cfg.contextRefs ?? []),
  ];
  const seen = new Set<string>();
  return refs.filter((ref) => !seen.has(contextRefKey(ref)) && !!seen.add(contextRefKey(ref)));
}

/** -1 (all) or a whole number of hops; missing = 0. */
export const contextLinkDepthOf = (cfg: Pick<PyramidConfig, 'contextLinkDepth'>): number => {
  const depth = cfg.contextLinkDepth ?? 0;
  return depth === -1 ? -1 : Math.max(0, Math.floor(depth));
};

export const hasContext = (cfg: PyramidConfig): boolean =>
  cfg.context.trim().length > 0 || contextRefsOf(cfg).length > 0;

export const panelistTemperature = (p: PanelistConfig) => p.temperature ?? PANELIST_DEFAULTS.temperature;
export const panelistMaxTokens = (p: PanelistConfig) => p.maxTokens ?? PANELIST_DEFAULTS.maxTokens;
export const hostTemperature = (h: HostConfig) => h.temperature ?? HOST_DEFAULTS.temperature;
export const hostMaxTokens = (h: HostConfig) => h.maxTokens ?? HOST_DEFAULTS.maxTokens;
