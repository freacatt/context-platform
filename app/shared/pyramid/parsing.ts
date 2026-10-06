/**
 * Parse and validate model output. Models reply with `{"cells": [...]}` in snake_case;
 * the parser tolerates ``` fences and surrounding prose, rejects missing or extra labels
 * and missing required fields per cell kind, and drops harmless superfluous fields.
 */
import { coord, kind, parents as parentLabels, rowLabels, type CellKind } from './board';
import type { HostCell, PanelCell } from './types';

export const SUMMARY_MAX_WORDS = 100;

/** Invalid model output; the retry prompt includes this message. */
export class ModelOutputError extends Error {}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

const FENCE_RE = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/g;

/** Extracts one JSON object from model text. */
export function parseJsonBlock(text: string): Json {
  const candidates = [text.trim(), ...[...text.matchAll(FENCE_RE)].map((m) => m[1].trim())];
  for (const candidate of candidates) {
    try {
      const value: unknown = JSON.parse(candidate);
      if (isObject(value)) return value;
    } catch {
      // try the next candidate
    }
  }
  // Fall back to the first balanced {...} that parses.
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    const end = balancedEnd(text, start);
    if (end === -1) continue;
    try {
      const value: unknown = JSON.parse(text.slice(start, end + 1));
      if (isObject(value)) return value;
    } catch {
      // keep scanning
    }
  }
  const preview = text.trim().replace(/\n/g, ' ').slice(0, 120);
  throw new ModelOutputError(`no JSON object found in model output: ${JSON.stringify(preview)}`);
}

/** Index of the brace closing the object that opens at `start`, string-aware; -1 if none. */
function balancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i;
  }
  return -1;
}

const blank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && !v.trim());

/** Reads a field in snake_case or camelCase. */
const field = (item: Json, snake: string): unknown => {
  if (snake in item) return item[snake];
  const camel = snake.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());
  return item[camel];
};

function itemsByLabel(data: unknown, n: number, row: number): Map<string, Json> {
  if (!isObject(data) || !Array.isArray(data.cells)) {
    throw new ModelOutputError('output must be an object with a "cells" list');
  }
  const expected = rowLabels(n, row);
  const items = new Map<string, Json>();
  for (const item of data.cells) {
    if (!isObject(item) || typeof item.label !== 'string') {
      throw new ModelOutputError('every cell must be an object with a string label');
    }
    const lbl = item.label.trim().toUpperCase();
    if (items.has(lbl)) throw new ModelOutputError(`duplicate label ${lbl}`);
    items.set(lbl, item);
  }
  const missing = expected.filter((l) => !items.has(l));
  const extra = [...items.keys()].filter((l) => !expected.includes(l)).sort();
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`missing labels ${missing.join(', ')}`);
    if (extra.length) parts.push(`unexpected labels ${extra.join(', ')}`);
    throw new ModelOutputError(`row ${row} must contain exactly ${expected.join(', ')}: ${parts.join('; ')}`);
  }
  return new Map(expected.map((l) => [l, items.get(l)!]));
}

function text(item: Json, name: string, lbl: string): string {
  const value = field(item, name);
  if (typeof value !== 'string' || !value.trim()) throw new ModelOutputError(`${lbl}: ${name} must be a non-empty string`);
  return value.trim();
}

/** combined_question and next_question, with nullability enforced per cell kind. */
function questions(item: Json, k: CellKind, lbl: string) {
  const merges = k === 'merge' || k === 'final';
  const combined = field(item, 'combined_question');
  const next = field(item, 'next_question');
  if (merges && blank(combined)) throw new ModelOutputError(`${lbl} (${k}) requires a combined_question`);
  if (k === 'final' && !blank(next)) throw new ModelOutputError(`${lbl} is the FINAL cell; next_question must be null`);
  if (k !== 'final' && blank(next)) throw new ModelOutputError(`${lbl} (${k}) requires a next_question`);
  const str = (v: unknown, what: string) => {
    if (typeof v !== 'string') throw new ModelOutputError(`${lbl}: ${what} must be a string`);
    return v.trim();
  };
  return {
    // An EDGE cell's restated question carries no information: dropped, not rejected.
    combinedQuestion: merges ? str(combined, 'combined_question') : null,
    nextQuestion: k === 'final' ? null : str(next, 'next_question'),
  };
}

export function validatePanelRow(data: unknown, n: number, row: number): PanelCell[] {
  return [...itemsByLabel(data, n, row)].map(([lbl, item]) => ({
    label: lbl,
    ...questions(item, kind(n, ...coord(n, lbl)), lbl),
    answer: text(item, 'answer', lbl),
  }));
}

/** The host's row output, in board row order (u ascending). */
export function validateHostRow(data: unknown, n: number, row: number): HostCell[] {
  return [...itemsByLabel(data, n, row)].map(([lbl, item]) => {
    const [u, v] = coord(n, lbl);
    const k = kind(n, u, v);

    let dissent = field(item, 'dissent');
    if (typeof dissent === 'string') dissent = dissent.trim() ? [dissent.trim()] : [];
    else if (dissent === null || dissent === undefined) dissent = [];
    if (!Array.isArray(dissent) || !dissent.every((d) => typeof d === 'string')) {
      throw new ModelOutputError(`${lbl}: dissent must be a list of strings`);
    }

    const confidence = Number(field(item, 'confidence'));
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new ModelOutputError(`${lbl}: confidence must be a number from 0 to 1`);
    }

    const words = text(item, 'summary', lbl).split(/\s+/);
    const summary = words.length > SUMMARY_MAX_WORDS ? `${words.slice(0, SUMMARY_MAX_WORDS).join(' ')} ...` : words.join(' ');

    let primaryParent: string | null = null;
    if (k === 'merge' || k === 'final') {
      const allowed = parentLabels(u, v);
      const raw = field(item, 'primary_parent');
      const pp = typeof raw === 'string' ? raw.trim().toUpperCase() : raw;
      if (typeof pp !== 'string' || !allowed.includes(pp)) {
        throw new ModelOutputError(`${lbl}: primary_parent must be one of ${allowed.join(' or ')}, got ${JSON.stringify(raw ?? null)}`);
      }
      primaryParent = pp;
    }

    return {
      label: lbl,
      ...questions(item, k, lbl),
      conclusion: text(item, 'conclusion', lbl),
      dissent: (dissent as string[]).map((d) => d.trim()).filter(Boolean),
      confidence,
      summary,
      primaryParent,
    };
  });
}

/** What one call said about one cell, read leniently for display (nothing is validated). */
export interface CellStatement {
  combinedQuestion: string | null;
  answer: string | null;
  conclusion: string | null;
  nextQuestion: string | null;
  dissent: string[];
  confidence: number | null;
  primaryParent: string | null;
}

/** The entry for `label` in a model's raw row output, or null when it is not there or not JSON. */
export function extractCellStatement(output: string, label: string): CellStatement | null {
  let data: Json;
  try {
    data = parseJsonBlock(output);
  } catch {
    return null;
  }
  const cells = Array.isArray(data.cells) ? data.cells : [];
  const item = cells.find((c): c is Json => isObject(c) && typeof c.label === 'string' && c.label.trim().toUpperCase() === label);
  if (!item) return null;
  const str = (name: string) => {
    const v = field(item, name);
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  const dissent = field(item, 'dissent');
  const confidence = Number(field(item, 'confidence'));
  return {
    combinedQuestion: str('combined_question'),
    answer: str('answer'),
    conclusion: str('conclusion'),
    nextQuestion: str('next_question'),
    dissent: Array.isArray(dissent) ? dissent.filter((d): d is string => typeof d === 'string' && !!d.trim()) : typeof dissent === 'string' && dissent.trim() ? [dissent.trim()] : [],
    confidence: field(item, 'confidence') != null && Number.isFinite(confidence) ? confidence : null,
    primaryParent: str('primary_parent'),
  };
}
