import { describe, it, expect } from 'vitest';
import { nativeToScVal, scValToNative } from '../src/scval.js';
import { Address } from '../src/address.js';

const PUBKEY = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';
const CONTRACT = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

describe('nativeToScVal', () => {
  describe('with explicit type', () => {
    it('bool', () => {
      const r1 = nativeToScVal(true, { type: 'bool' });
      expect(r1._toModern()).toEqual({ Bool: true });
      const r2 = nativeToScVal(false, { type: 'bool' });
      expect(r2._toModern()).toEqual({ Bool: false });
    });

    it('void', () => {
      const r = nativeToScVal(null, { type: 'void' });
      expect(r._toModern()).toBe('Void');
    });

    it('u32', () => {
      const r = nativeToScVal(42, { type: 'u32' });
      expect(r._toModern()).toEqual({ U32: 42 });
    });

    it('i32', () => {
      const r = nativeToScVal(-10, { type: 'i32' });
      expect(r._toModern()).toEqual({ I32: -10 });
    });

    it('u64', () => {
      const r = nativeToScVal(100, { type: 'u64' });
      expect(r._toModern()).toEqual({ U64: 100n });
    });

    it('i64', () => {
      const r = nativeToScVal(-100, { type: 'i64' });
      expect(r._toModern()).toEqual({ I64: -100n });
    });

    it('string', () => {
      const r = nativeToScVal('hello', { type: 'string' });
      expect(r._toModern()).toEqual({ String: 'hello' });
    });

    it('symbol', () => {
      const r = nativeToScVal('transfer', { type: 'symbol' });
      expect(r._toModern()).toEqual({ Symbol: 'transfer' });
    });

    it('bytes from Uint8Array', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const r = nativeToScVal(bytes, { type: 'bytes' });
      expect(r._toModern()).toEqual({ Bytes: bytes });
    });

    it('address from string', () => {
      const result = nativeToScVal(PUBKEY, { type: 'address' });
      expect(typeof result.switch).toBe('function');
      const modern = result._toModern();
      expect('Address' in modern).toBe(true);
    });

    it('address from Address object', () => {
      const addr = new Address(PUBKEY);
      const result = nativeToScVal(addr, { type: 'address' });
      expect(typeof result.switch).toBe('function');
      const modern = result._toModern();
      expect('Address' in modern).toBe(true);
    });
  });

  describe('auto-detection', () => {
    it('boolean → Bool', () => {
      const r = nativeToScVal(true);
      expect(r._toModern()).toEqual({ Bool: true });
    });

    it('positive integer → U64', () => {
      // Auto-detection now maps numbers to U64/I64 (not U32/I32)
      const r = nativeToScVal(42);
      expect(r._toModern()).toEqual({ U64: 42n });
    });

    it('negative integer → I64', () => {
      const r = nativeToScVal(-5);
      expect(r._toModern()).toEqual({ I64: -5n });
    });

    it('small bigint → U64', () => {
      // Small bigints now go to U64 instead of U32
      const r = nativeToScVal(100n);
      expect(r._toModern()).toEqual({ U64: 100n });
    });

    it('large bigint → U64', () => {
      const r = nativeToScVal(5000000000n);
      expect(r._toModern()).toEqual({ U64: 5000000000n });
    });

    it('string → String', () => {
      // Auto-detection for strings changed from Symbol to String
      const r = nativeToScVal('test');
      expect(r._toModern()).toEqual({ String: 'test' });
    });

    it('Uint8Array → Bytes', () => {
      const b = new Uint8Array([10, 20]);
      const r = nativeToScVal(b);
      expect(r._toModern()).toEqual({ Bytes: b });
    });

    it('null → Void', () => {
      const r = nativeToScVal(null);
      expect(r._toModern()).toBe('Void');
    });

    it('undefined → Void', () => {
      const r = nativeToScVal(undefined);
      expect(r._toModern()).toBe('Void');
    });

    it('array → Vec', () => {
      const result = nativeToScVal([1, 2, 3]);
      const modern = result._toModern();
      expect('Vec' in modern).toBe(true);
      expect(modern.Vec.length).toBe(3);
    });

    it('object → Map', () => {
      const result = nativeToScVal({ a: 1, b: true });
      const modern = result._toModern();
      expect('Map' in modern).toBe(true);
      expect(modern.Map.length).toBe(2);
    });

    it('Address → Address ScVal', () => {
      const addr = new Address(PUBKEY);
      const result = nativeToScVal(addr);
      expect(typeof result.switch).toBe('function');
      const modern = result._toModern();
      expect('Address' in modern).toBe(true);
    });

    it('throws for non-integer number', () => {
      expect(() => nativeToScVal(3.14)).toThrow();
    });
  });
});

describe('scValToNative', () => {
  it('Void → null', () => {
    expect(scValToNative('Void')).toBeNull();
  });

  it('Bool → boolean', () => {
    expect(scValToNative({ Bool: true })).toBe(true);
    expect(scValToNative({ Bool: false })).toBe(false);
  });

  it('U32 → number', () => {
    expect(scValToNative({ U32: 42 })).toBe(42);
  });

  it('I32 → number', () => {
    expect(scValToNative({ I32: -10 })).toBe(-10);
  });

  it('U64 → bigint', () => {
    expect(scValToNative({ U64: 100n })).toBe(100n);
  });

  it('I64 → bigint', () => {
    expect(scValToNative({ I64: -50n })).toBe(-50n);
  });

  it('String → string', () => {
    expect(scValToNative({ String: 'hello' })).toBe('hello');
  });

  it('Symbol → string', () => {
    expect(scValToNative({ Symbol: 'transfer' })).toBe('transfer');
  });

  it('Bytes → Uint8Array', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(scValToNative({ Bytes: bytes })).toEqual(bytes);
  });

  it('Vec → array', () => {
    const result = scValToNative({ Vec: [{ U32: 1 }, { U32: 2 }] });
    expect(result).toEqual([1, 2]);
  });

  it('Map → object', () => {
    const result = scValToNative({
      Map: [
        { key: { Symbol: 'name' }, val: { String: 'test' } },
        { key: { Symbol: 'count' }, val: { U32: 42 } },
      ],
    });
    expect(result).toEqual({ name: 'test', count: 42 });
  });

  it('Address → string', () => {
    // Address.toScVal() now returns compat, scValToNative converts via _toModern()
    const scval = new Address(PUBKEY).toScVal();
    const result = scValToNative(scval);
    // scValToNative for Address now returns the string address, not Address object
    expect(typeof result).toBe('string');
    expect(result).toBe(PUBKEY);
  });

  describe('roundtrip', () => {
    it('bool roundtrips', () => {
      expect(scValToNative(nativeToScVal(true))).toBe(true);
    });

    it('u32 roundtrips', () => {
      // Auto-detection now maps numbers to U64 → scValToNative returns bigint
      expect(scValToNative(nativeToScVal(42))).toBe(42n);
    });

    it('string roundtrips', () => {
      expect(scValToNative(nativeToScVal('hello'))).toBe('hello');
    });

    it('null roundtrips', () => {
      expect(scValToNative(nativeToScVal(null))).toBeNull();
    });

    it('array roundtrips', () => {
      // Auto-detection maps numbers to U64 → roundtrip yields bigints
      expect(scValToNative(nativeToScVal([1, 2, 3]))).toEqual([1n, 2n, 3n]);
    });
  });
});
