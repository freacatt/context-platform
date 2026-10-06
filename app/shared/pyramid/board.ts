/**
 * Board geometry: an N×N grid rotated 45° (a diamond).
 *
 * Cell (u, v) is labelled `chr(65 + u) + (v + 1)` — (0,0) = A1, (7,7) = H8 — and sits in
 * row `u + v`. Rows widen from the ROOT (A1) to the middle diagonal, then narrow to the
 * FINAL cell. Every cell except the ROOT is concluded by a model; row 0 needs no call.
 */

export const MIN_BOARD_SIZE = 2;
export const MAX_BOARD_SIZE = 8;
export const DEFAULT_BOARD_SIZE = 8;

export type CellKind = 'root' | 'edge' | 'merge' | 'final';
export type Coord = [u: number, v: number];

export interface CellGeom {
  label: string;
  u: number;
  v: number;
  row: number;
  kind: CellKind;
  /** Parent labels, (u-1, v) first. */
  parents: string[];
}

const LABEL_RE = /^([A-Z])([1-9])$/;

export function assertBoardSize(n: number): void {
  if (!Number.isInteger(n) || n < MIN_BOARD_SIZE || n > MAX_BOARD_SIZE) {
    throw new Error(`board size must be an integer in ${MIN_BOARD_SIZE}..${MAX_BOARD_SIZE}, got ${n}`);
  }
}

export const label = (u: number, v: number): string => String.fromCharCode(65 + u) + String(v + 1);

/** Coordinate of a label, or null when it is malformed or outside an n×n board. */
export function coordOf(n: number, lbl: string): Coord | null {
  const m = LABEL_RE.exec(lbl);
  if (!m) return null;
  const u = m[1].charCodeAt(0) - 65;
  const v = Number(m[2]) - 1;
  return u < n && v < n ? [u, v] : null;
}

export function coord(n: number, lbl: string): Coord {
  const c = coordOf(n, lbl);
  if (!c) throw new Error(`invalid cell label ${JSON.stringify(lbl)} for a ${n}x${n} board`);
  return c;
}

export const lastRow = (n: number): number => 2 * n - 2;

/** Rows a model works on: 1 .. 2n-2. */
export const workingRows = (n: number): number[] => Array.from({ length: lastRow(n) }, (_, i) => i + 1);

export function kind(n: number, u: number, v: number): CellKind {
  if (u === 0 && v === 0) return 'root';
  if (u === n - 1 && v === n - 1) return 'final';
  if (u === 0 || v === 0) return 'edge';
  return 'merge';
}

export const kindOf = (n: number, lbl: string): CellKind => kind(n, ...coord(n, lbl));

export function parents(u: number, v: number): string[] {
  const out: string[] = [];
  if (u > 0) out.push(label(u - 1, v));
  if (v > 0) out.push(label(u, v - 1));
  return out;
}

/** Cells of row r, ordered by u ascending. */
export function rowCoords(n: number, r: number): Coord[] {
  if (r < 0 || r > lastRow(n)) throw new Error(`row ${r} outside 0..${lastRow(n)}`);
  const out: Coord[] = [];
  for (let u = Math.max(0, r - n + 1); u <= Math.min(r, n - 1); u++) out.push([u, r - u]);
  return out;
}

export const rowLabels = (n: number, r: number): string[] => rowCoords(n, r).map(([u, v]) => label(u, v));

export const rowOf = (n: number, lbl: string): number => {
  const [u, v] = coord(n, lbl);
  return u + v;
};

/** Every cell of the board, row by row. */
export function cells(n: number): CellGeom[] {
  assertBoardSize(n);
  const out: CellGeom[] = [];
  for (let r = 0; r <= lastRow(n); r++) {
    for (const [u, v] of rowCoords(n, r)) {
      out.push({ label: label(u, v), u, v, row: r, kind: kind(n, u, v), parents: parents(u, v) });
    }
  }
  return out;
}

export const rootLabel = (): string => label(0, 0);
export const finalLabel = (n: number): string => label(n - 1, n - 1);

/**
 * Labels from ROOT to FINAL along `primaryParent` (EDGE cells have a single parent).
 * Empty until the FINAL cell is concluded.
 */
export function criticalPath(
  n: number,
  primaryParent: (lbl: string) => string | null | undefined,
  concluded: (lbl: string) => boolean,
): string[] {
  let current = finalLabel(n);
  if (!concluded(current)) return [];
  const path = [current];
  for (;;) {
    const [u, v] = coord(n, current);
    const k = kind(n, u, v);
    if (k === 'root') break;
    const next = k === 'edge' ? parents(u, v)[0] : primaryParent(current);
    if (!next) break;
    current = next;
    path.push(current);
  }
  return path.reverse();
}

/** "expansion", "convergence" or "the final convergence" — tells models where the row sits. */
export function phase(n: number, r: number): string {
  if (r === lastRow(n)) return 'the final convergence';
  if (r < n) return 'expansion (questions branch out)';
  return 'convergence (lines of inquiry merge)';
}

// --- layout (UI) -------------------------------------------------------------------------

export const BLOCK_SIZE = 80;
/** Distance between neighbouring block centres: the diagonal of a block. */
export const SPACING = BLOCK_SIZE * Math.SQRT2;

/** Pixel centre of a rotated block: root on top, rows going down. */
export const calculateCoordinates = (u: number, v: number) => ({
  x: (v - u) * (SPACING / 2),
  y: (u + v) * (SPACING / 2),
});
