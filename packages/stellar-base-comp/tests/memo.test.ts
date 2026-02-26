import { describe, it, expect } from 'vitest';
import { Memo } from '../src/memo.js';

describe('Memo', () => {
  it('creates none memo', () => {
    const m = Memo.none();
    expect(m.type).toBe('none');
    expect(m.value).toBeNull();
  });

  it('creates text memo', () => {
    const m = Memo.text('hello');
    expect(m.type).toBe('text');
    expect(m.value).toBe('hello');
  });

  it('creates id memo', () => {
    const m = Memo.id('12345');
    expect(m.type).toBe('id');
    expect(m.value).toBe('12345');
  });

  it('creates hash memo', () => {
    const hash = new Uint8Array(32);
    const m = Memo.hash(hash);
    expect(m.type).toBe('hash');
    expect(m.value).toEqual(hash);
  });

  it('creates return memo', () => {
    const hash = new Uint8Array(32);
    const m = Memo.return(hash);
    expect(m.type).toBe('return');
  });

  it('throws on invalid text length', () => {
    expect(() => Memo.text('a'.repeat(29))).toThrow();
  });

  it('throws on invalid hash length', () => {
    expect(() => Memo.hash(new Uint8Array(16))).toThrow();
  });

  it('roundtrips through modern', () => {
    const m = Memo.text('world');
    const modern = m._toModern();
    const back = Memo._fromModern(modern);
    expect(back.type).toBe('text');
    expect(back.value).toBe('world');
  });

  it('roundtrips none through modern', () => {
    const m = Memo.none();
    const modern = m._toModern();
    const back = Memo._fromModern(modern);
    expect(back.type).toBe('none');
  });

  it('roundtrips id through modern', () => {
    const m = Memo.id('999');
    const modern = m._toModern();
    const back = Memo._fromModern(modern);
    expect(back.type).toBe('id');
    expect(back.value).toBe('999');
  });
});
