/**
 * Converter helpers for translating between compat and modern values.
 * Each converter is { toCompat(modern), toModern(compat) }.
 */

import { Hyper, UnsignedHyper } from './hyper.js';

export interface Converter<C, M> {
  toCompat(modern: M): C;
  toModern(compat: C): M;
}

/** Identity — no conversion needed (numbers, strings, Uint8Array, etc.) */
export function identity<T>(): Converter<T, T> {
  return { toCompat: (v) => v, toModern: (v) => v };
}

/** Signed int64 ↔ Hyper */
export function hyperConverter(): Converter<Hyper, bigint> {
  return {
    toCompat: (v) => Hyper.fromBigInt(v),
    toModern: (v) => typeof v === 'bigint' ? v : v.toBigInt(),
  };
}

/** Unsigned int64 ↔ UnsignedHyper */
export function unsignedHyperConverter(): Converter<UnsignedHyper, bigint> {
  return {
    toCompat: (v) => UnsignedHyper.fromBigInt(v),
    toModern: (v) => typeof v === 'bigint' ? v : v.toBigInt(),
  };
}

/** Option<T>: wraps null/value with an inner converter */
export function optionConverter<C, M>(inner: Converter<C, M>): Converter<C | null, M | null> {
  return {
    toCompat: (v) => (v == null ? null : inner.toCompat(v)),
    toModern: (v) => (v == null ? null : inner.toModern(v)),
  };
}

/** Fixed-length or variable-length array converter */
export function arrayConverter<C, M>(inner: Converter<C, M>): Converter<C[], M[]> {
  return {
    toCompat: (arr) => arr.map((v) => inner.toCompat(v)),
    toModern: (arr) => arr.map((v) => inner.toModern(v)),
  };
}

/**
 * Lazy converter — defers lookup until first use.
 * Solves circular dependency issues in generated code.
 */
export function lazyConverter<C, M>(factory: () => Converter<C, M>): Converter<C, M> {
  let cached: Converter<C, M> | undefined;
  const get = () => (cached ??= factory());
  return {
    toCompat: (v) => get().toCompat(v),
    toModern: (v) => get().toModern(v),
  };
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/**
 * Opaque string converter — for opaque fields that the old SDK returns as strings.
 * Converts Uint8Array (modern) ↔ string (compat).
 */
export function opaqueStringConv(): Converter<string, Uint8Array> {
  return {
    toCompat: (v: Uint8Array) => {
      if (typeof v === 'string') return v;
      return decoder.decode(v);
    },
    toModern: (v: any) => {
      if (v instanceof Uint8Array) return v;
      return encoder.encode(v);
    },
  };
}

/** Struct converter — delegates to a compat struct class */
export function structConverter<T extends { _fromModern(v: any): any }>(cls: T): Converter<any, any> {
  return {
    toCompat: (v: any) => (cls as any)._fromModern(v),
    toModern: (v: any) => v._toModern(),
  };
}

/** Union converter — delegates to a compat union class */
export function unionConverter<T extends { _fromModern(v: any): any }>(cls: T): Converter<any, any> {
  return {
    toCompat: (v: any) => (cls as any)._fromModern(v),
    toModern: (v: any) => v._toModern(),
  };
}

/** Enum converter — delegates to a compat enum class */
export function enumConverter<T extends { _fromModern(v: any): any }>(cls: T): Converter<any, any> {
  return {
    toCompat: (v: any) => (cls as any)._fromModern(v),
    toModern: (v: any) => v._toModern?.() ?? v,
  };
}
