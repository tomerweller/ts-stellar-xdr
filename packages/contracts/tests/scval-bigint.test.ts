import { describe, it, expect } from 'vitest';
import { scValToBigInt } from '../src/scval-bigint.js';
import type { SCVal } from '@stellar/xdr';

describe('scValToBigInt', () => {
  it('converts U64', () => {
    const scv: SCVal = { U64: 12345n };
    expect(scValToBigInt(scv)).toBe(12345n);
  });

  it('converts I64', () => {
    const scv: SCVal = { I64: -999n };
    expect(scValToBigInt(scv)).toBe(-999n);
  });

  it('converts U128', () => {
    const scv: SCVal = { U128: { hi: 1n, lo: 0n } };
    expect(scValToBigInt(scv)).toBe(2n ** 64n);
  });

  it('converts I128 positive', () => {
    const scv: SCVal = { I128: { hi: 0n, lo: 42n } };
    expect(scValToBigInt(scv)).toBe(42n);
  });

  it('converts I128 negative', () => {
    const scv: SCVal = { I128: { hi: -1n, lo: 2n ** 64n - 1n } };
    expect(scValToBigInt(scv)).toBe(-1n);
  });

  it('converts U256', () => {
    const scv: SCVal = { U256: { hiHi: 0n, hiLo: 0n, loHi: 1n, loLo: 0n } };
    expect(scValToBigInt(scv)).toBe(2n ** 64n);
  });

  it('converts I256 positive', () => {
    const scv: SCVal = {
      I256: { hiHi: 0n, hiLo: 0n, loHi: 0n, loLo: 100n },
    };
    expect(scValToBigInt(scv)).toBe(100n);
  });

  it('converts I256 negative', () => {
    const scv: SCVal = {
      I256: {
        hiHi: -1n,
        hiLo: 2n ** 64n - 1n,
        loHi: 2n ** 64n - 1n,
        loLo: 2n ** 64n - 1n,
      },
    };
    expect(scValToBigInt(scv)).toBe(-1n);
  });

  it('converts Timepoint', () => {
    const scv: SCVal = { Timepoint: 1700000000n };
    expect(scValToBigInt(scv)).toBe(1700000000n);
  });

  it('converts Duration', () => {
    const scv: SCVal = { Duration: 3600n };
    expect(scValToBigInt(scv)).toBe(3600n);
  });

  it('throws for non-integer SCVal types', () => {
    expect(() => scValToBigInt('Void')).toThrow(TypeError);
    expect(() => scValToBigInt({ Bool: true })).toThrow(TypeError);
    expect(() => scValToBigInt({ String: 'hello' })).toThrow(TypeError);
    expect(() => scValToBigInt({ Symbol: 'sym' })).toThrow(TypeError);
  });
});
