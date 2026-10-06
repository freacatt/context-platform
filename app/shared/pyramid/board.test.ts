import { describe, expect, it } from 'vitest';
import { cells, coordOf, criticalPath, kind, label, lastRow, rowLabels, workingRows } from './board';

const SIZES = [2, 3, 4, 5, 6, 7, 8];

describe('board geometry', () => {
  it.each(SIZES)('a %i board has n² cells in 2n-1 rows', (n) => {
    const all = cells(n);
    expect(all).toHaveLength(n * n);
    expect(new Set(all.map((c) => c.row)).size).toBe(2 * n - 1);
    expect(workingRows(n)).toEqual(Array.from({ length: 2 * n - 2 }, (_, i) => i + 1));
  });

  it.each(SIZES)('rows of a %i board widen to n, then narrow back to one', (n) => {
    const widths = Array.from({ length: lastRow(n) + 1 }, (_, r) => rowLabels(n, r).length);
    expect(widths).toEqual([...Array.from({ length: n }, (_, i) => i + 1), ...Array.from({ length: n - 1 }, (_, i) => n - 1 - i)]);
  });

  it('labels and kinds follow the spec', () => {
    expect(label(0, 0)).toBe('A1');
    expect(label(7, 7)).toBe('H8');
    expect(rowLabels(4, 1)).toEqual(['A2', 'B1']);
    expect(kind(4, 0, 0)).toBe('root');
    expect(kind(4, 0, 2)).toBe('edge');
    expect(kind(4, 1, 1)).toBe('merge');
    expect(kind(4, 3, 3)).toBe('final');
    expect(cells(3).find((c) => c.label === 'B2')?.parents).toEqual(['A2', 'B1']);
  });

  it('rejects invalid sizes and labels', () => {
    expect(() => cells(1)).toThrow();
    expect(() => cells(9)).toThrow();
    expect(coordOf(4, 'E1')).toBeNull();
    expect(coordOf(4, 'a1')).toBeNull();
    expect(coordOf(4, 'B3')).toEqual([1, 2]);
  });

  it('critical path follows primary parents from root to final', () => {
    const primary: Record<string, string> = { B2: 'A2', C3: 'B3', B3: 'A3', C2: 'B2' };
    const path = criticalPath(3, (l) => primary[l], () => true);
    expect(path).toEqual(['A1', 'A2', 'A3', 'B3', 'C3']);
    expect(criticalPath(3, (l) => primary[l], (l) => l !== 'C3')).toEqual([]);
  });

  it.each(SIZES)('a complete critical path on a %i board has 2n-1 steps', (n) => {
    const path = criticalPath(n, (l) => cells(n).find((c) => c.label === l)!.parents[0], () => true);
    expect(path).toHaveLength(2 * n - 1);
    expect(path[0]).toBe('A1');
  });
});
