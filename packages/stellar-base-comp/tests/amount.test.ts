import { describe, it, expect } from 'vitest';
import { toStroops, fromStroops, amountToBigInt } from '../src/amount.js';

describe('toStroops', () => {
  it('converts whole numbers', () => {
    expect(toStroops('100')).toBe('1000000000');
  });

  it('converts fractional amounts', () => {
    expect(toStroops('100.5')).toBe('1005000000');
  });

  it('converts very small fractions', () => {
    expect(toStroops('0.0000001')).toBe('1');
  });

  it('throws on too many decimals', () => {
    expect(() => toStroops('0.00000001')).toThrow();
  });
});

describe('fromStroops', () => {
  it('converts whole amounts', () => {
    // fromStroops now always returns 7 decimal places to match js-stellar-base
    expect(fromStroops('1000000000')).toBe('100.0000000');
  });

  it('converts fractional amounts', () => {
    expect(fromStroops('1005000000')).toBe('100.5000000');
  });

  it('preserves all 7 decimals', () => {
    expect(fromStroops('1')).toBe('0.0000001');
  });
});

describe('amountToBigInt', () => {
  it('returns bigint stroops', () => {
    expect(amountToBigInt('100.5')).toBe(1005000000n);
  });
});
