import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, roundMoney, scale, sumMoney, times, tryParseMoney, usd, usdCompact } from './money';

describe('money', () => {
  it('parses and formats decimal strings exactly', () => {
    expect(formatMoney(parseMoney('0.000000075'))).toBe('0.000000075');
    expect(formatMoney(parseMoney('12'))).toBe('12');
    expect(formatMoney(parseMoney('.5'))).toBe('0.5');
    expect(formatMoney(parseMoney('-1.25'))).toBe('-1.25');
    expect(formatMoney(parseMoney(1.5e-7))).toBe('0.00000015');
  });

  it('never drifts like floats do', () => {
    expect(formatMoney(sumMoney([parseMoney('0.1'), parseMoney('0.2')]))).toBe('0.3');
    expect(formatMoney(times(parseMoney('0.00000015'), 1_000_000))).toBe('0.15');
    expect(formatMoney(scale(parseMoney('1'), 85n, 100n))).toBe('0.85');
  });

  it('rounds half away from zero and pads fixed digits', () => {
    expect(formatMoney(roundMoney(parseMoney('0.0000125'), 5))).toBe('0.00001');
    expect(formatMoney(parseMoney('0.00001249'), 5)).toBe('0.00001');
    expect(formatMoney(parseMoney('0.000015'), 5)).toBe('0.00002');
    expect(formatMoney(parseMoney('2'), 4)).toBe('2.0000');
    expect(usd('0.12345')).toBe('$0.1235');
    expect(usd(null)).toBe('-');
  });

  it('rejects garbage', () => {
    expect(() => parseMoney('abc')).toThrow();
    expect(() => parseMoney('')).toThrow();
    expect(tryParseMoney('1e5')).toBeNull();
    expect(tryParseMoney(undefined)).toBeNull();
  });
});

describe('usdCompact', () => {
  it('uses cents, or 4 decimals under a cent', () => {
    expect(usdCompact('12.345')).toBe('$12.35');
    expect(usdCompact('0.0042')).toBe('$0.0042');
    expect(usdCompact('0')).toBe('$0.00');
    expect(usdCompact(null)).toBe('-');
  });
});
