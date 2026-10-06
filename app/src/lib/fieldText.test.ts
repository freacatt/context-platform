import { describe, expect, it } from 'vitest';
import { fieldToText, isFieldFilled, textToField } from './fieldText';
import { getValueAtPath, setValueAtPath } from './objectPath';

describe('fieldText', () => {
  it('round-trips lists, dropping blank lines', () => {
    expect(textToField(' a \n\n b ', 'list')).toEqual(['a', 'b']);
    expect(fieldToText(['a', 'b'], 'list')).toBe('a\nb');
  });

  it('round-trips maps, keeping colons inside values', () => {
    const map = textToField('url: https://x.io\nnot a pair\n: no key', 'map');
    expect(map).toEqual({ url: 'https://x.io' });
    expect(fieldToText({ a: '1', b: '2' }, 'map')).toBe('a: 1\nb: 2');
  });

  it('keeps strings as typed and shows nothing for missing values', () => {
    expect(textToField('  keep spaces ', 'string')).toBe('  keep spaces ');
    expect(fieldToText(undefined, 'string')).toBe('');
  });

  it('knows when a field is filled', () => {
    expect([isFieldFilled(''), isFieldFilled('  '), isFieldFilled([]), isFieldFilled({})]).toEqual([false, false, false, false]);
    expect([isFieldFilled('x'), isFieldFilled(['x']), isFieldFilled({ k: 'v' })]).toEqual([true, true, true]);
  });
});

describe('objectPath', () => {
  it('reads nested values and tolerates missing steps', () => {
    expect(getValueAtPath({ a: { b: 1 } }, ['a', 'b'])).toBe(1);
    expect(getValueAtPath({ a: null }, ['a', 'b'])).toBeUndefined();
  });

  it('sets nested values without mutating the original', () => {
    const original = { a: { b: 1, c: 2 }, d: 3 };
    const updated = setValueAtPath(original, ['a', 'b'], 9);
    expect(updated).toEqual({ a: { b: 9, c: 2 }, d: 3 });
    expect(original.a.b).toBe(1);
    expect(updated.a).not.toBe(original.a);
  });

  it('creates missing intermediate objects', () => {
    expect(setValueAtPath({}, ['x', 'y'], 'z')).toEqual({ x: { y: 'z' } });
  });
});
