import { describe, it, expect } from 'vitest';
import { ScInt } from '../src/scint.js';
import { is } from '@stellar/xdr';

describe('ScInt', () => {
  describe('constructor', () => {
    it('accepts number', () => {
      const s = new ScInt(42);
      expect(s.toBigInt()).toBe(42n);
    });

    it('accepts bigint', () => {
      const s = new ScInt(123456789012345678901234n);
      expect(s.toBigInt()).toBe(123456789012345678901234n);
    });

    it('accepts string', () => {
      const s = new ScInt('99999999999999999999');
      expect(s.toBigInt()).toBe(99999999999999999999n);
    });

    it('validates range when type is provided', () => {
      expect(() => new ScInt(-1, { type: 'u64' })).toThrow(RangeError);
      expect(() => new ScInt(2n ** 64n, { type: 'u64' })).toThrow(RangeError);
    });
  });

  describe('toNumber', () => {
    it('converts small values', () => {
      expect(new ScInt(42).toNumber()).toBe(42);
    });

    it('throws on overflow', () => {
      const big = new ScInt(2n ** 64n);
      expect(() => big.toNumber()).toThrow(RangeError);
    });
  });

  describe('toI64', () => {
    it('produces I64 SCVal', () => {
      const val = new ScInt(100).toI64();
      expect(is(val, 'I64')).toBe(true);
      if (is(val, 'I64')) {
        expect(val.I64).toBe(100n);
      }
    });

    it('handles negative values', () => {
      const val = new ScInt(-50).toI64();
      expect(is(val, 'I64')).toBe(true);
      if (is(val, 'I64')) {
        expect(val.I64).toBe(-50n);
      }
    });

    it('rejects out-of-range values', () => {
      expect(() => new ScInt(2n ** 63n).toI64()).toThrow(RangeError);
    });
  });

  describe('toU64', () => {
    it('produces U64 SCVal', () => {
      const val = new ScInt(2n ** 64n - 1n).toU64();
      expect(is(val, 'U64')).toBe(true);
      if (is(val, 'U64')) {
        expect(val.U64).toBe(2n ** 64n - 1n);
      }
    });

    it('rejects negative', () => {
      expect(() => new ScInt(-1).toU64()).toThrow(RangeError);
    });
  });

  describe('toI128', () => {
    it('produces I128 SCVal', () => {
      const val = new ScInt(1000000n).toI128();
      expect(is(val, 'I128')).toBe(true);
      if (is(val, 'I128')) {
        expect(val.I128.hi).toBe(0n);
        expect(val.I128.lo).toBe(1000000n);
      }
    });

    it('handles negative values', () => {
      const val = new ScInt(-1).toI128();
      expect(is(val, 'I128')).toBe(true);
      if (is(val, 'I128')) {
        // -1 in two's complement: hi = -1, lo = max u64
        expect(val.I128.hi).toBe(-1n);
        expect(val.I128.lo).toBe(2n ** 64n - 1n);
      }
    });
  });

  describe('toU128', () => {
    it('produces U128 SCVal', () => {
      const bigVal = 2n ** 100n;
      const val = new ScInt(bigVal).toU128();
      expect(is(val, 'U128')).toBe(true);
      if (is(val, 'U128')) {
        expect((val.U128.hi << 64n) | val.U128.lo).toBe(bigVal);
      }
    });
  });

  describe('toI256', () => {
    it('produces I256 SCVal', () => {
      const val = new ScInt(42).toI256();
      expect(is(val, 'I256')).toBe(true);
      if (is(val, 'I256')) {
        expect(val.I256.hiHi).toBe(0n);
        expect(val.I256.hiLo).toBe(0n);
        expect(val.I256.loHi).toBe(0n);
        expect(val.I256.loLo).toBe(42n);
      }
    });
  });

  describe('toU256', () => {
    it('produces U256 SCVal', () => {
      const val = new ScInt(2n ** 200n).toU256();
      expect(is(val, 'U256')).toBe(true);
    });
  });

  describe('toScVal (auto-detect)', () => {
    it('chooses U64 for small positive', () => {
      const val = new ScInt(100).toScVal();
      expect(is(val, 'U64')).toBe(true);
    });

    it('chooses I64 for small negative', () => {
      const val = new ScInt(-100).toScVal();
      expect(is(val, 'I64')).toBe(true);
    });

    it('chooses U128 for large positive', () => {
      const val = new ScInt(2n ** 64n).toScVal();
      expect(is(val, 'U128')).toBe(true);
    });

    it('chooses I128 for large negative', () => {
      const val = new ScInt(-(2n ** 63n) - 1n).toScVal();
      expect(is(val, 'I128')).toBe(true);
    });

    it('chooses U256 for very large positive', () => {
      const val = new ScInt(2n ** 128n).toScVal();
      expect(is(val, 'U256')).toBe(true);
    });

    it('chooses I256 for very large negative', () => {
      const val = new ScInt(-(2n ** 127n) - 1n).toScVal();
      expect(is(val, 'I256')).toBe(true);
    });

    it('uses explicit type when provided', () => {
      const val = new ScInt(42, { type: 'i128' }).toScVal();
      expect(is(val, 'I128')).toBe(true);
    });
  });
});
