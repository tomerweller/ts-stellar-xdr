import { describe, it, expect } from 'vitest';
import { Hyper, UnsignedHyper } from '../src/xdr-compat/hyper.js';

describe('Hyper', () => {
  it('constructs from low/high and converts to bigint', () => {
    const h = new Hyper(1, 0);
    expect(h.toBigInt()).toBe(1n);
  });

  it('handles negative values', () => {
    const h = Hyper.fromBigInt(-1n);
    expect(h.toBigInt()).toBe(-1n);
  });

  it('roundtrips through fromString', () => {
    const h = Hyper.fromString('9223372036854775807');
    expect(h.toString()).toBe('9223372036854775807');
    expect(h.toBigInt()).toBe(9223372036854775807n);
  });

  it('roundtrips through fromBigInt', () => {
    const h = Hyper.fromBigInt(-42n);
    expect(h.toBigInt()).toBe(-42n);
    expect(h.toString()).toBe('-42');
  });

  it('has correct MAX/MIN_VALUE', () => {
    expect(Hyper.MAX_VALUE.toBigInt()).toBe(9223372036854775807n);
    expect(Hyper.MIN_VALUE.toBigInt()).toBe(-9223372036854775808n);
  });

  it('converts to modern bigint and back', () => {
    const h = Hyper.fromBigInt(12345n);
    const modern = h._toModern();
    expect(modern).toBe(12345n);
    const back = Hyper._fromModern(modern);
    expect(back.toBigInt()).toBe(12345n);
  });
});

describe('UnsignedHyper', () => {
  it('constructs and converts', () => {
    const uh = new UnsignedHyper(1, 0);
    expect(uh.toBigInt()).toBe(1n);
  });

  it('handles large unsigned values', () => {
    const uh = UnsignedHyper.fromString('18446744073709551615');
    expect(uh.toBigInt()).toBe(18446744073709551615n);
  });

  it('roundtrips through fromBigInt', () => {
    const uh = UnsignedHyper.fromBigInt(1000000000000n);
    expect(uh.toBigInt()).toBe(1000000000000n);
  });
});
