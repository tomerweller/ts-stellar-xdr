/**
 * nativeToScVal / scValToNative — JS ↔ SCVal conversion
 * Compatible with js-stellar-base.
 */

import { Address } from './address.js';

export interface NativeToScValOpts {
  type?: string;
}

export function nativeToScVal(val: any, opts?: NativeToScValOpts): any {
  const type = opts?.type;

  if (val === null || val === undefined) {
    return 'Void';
  }

  if (type) {
    switch (type) {
      case 'bool': return { Bool: Boolean(val) };
      case 'void': return 'Void';
      case 'u32': return { U32: Number(val) };
      case 'i32': return { I32: Number(val) };
      case 'u64': return { U64: BigInt(val) };
      case 'i64': return { I64: BigInt(val) };
      case 'u128': return { U128: { lo: BigInt(val) & 0xFFFFFFFFFFFFFFFFn, hi: BigInt(val) >> 64n } };
      case 'i128': return { I128: { lo: BigInt(val) & 0xFFFFFFFFFFFFFFFFn, hi: BigInt(val) >> 64n } };
      case 'u256': return { U256: val };
      case 'i256': return { I256: val };
      case 'bytes': return { Bytes: val instanceof Uint8Array ? val : new TextEncoder().encode(String(val)) };
      case 'string': return { String: String(val) };
      case 'symbol': return { Symbol: String(val) };
      case 'address':
        if (val instanceof Address) return val.toScVal();
        if (typeof val === 'string') return new Address(val).toScVal();
        return { Address: val };
    }
  }

  // Auto-detect type
  if (typeof val === 'boolean') return { Bool: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      if (val >= 0) return { U32: val };
      return { I32: val };
    }
    throw new Error('Non-integer numbers not supported in SCVal');
  }
  if (typeof val === 'bigint') {
    if (val >= 0n && val <= 0xFFFFFFFFn) return { U32: Number(val) };
    if (val >= -0x80000000n && val < 0n) return { I32: Number(val) };
    if (val >= 0n) return { U64: val };
    return { I64: val };
  }
  if (typeof val === 'string') return { Symbol: val };
  if (val instanceof Uint8Array) return { Bytes: val };
  if (val instanceof Address) return val.toScVal();
  if (Array.isArray(val)) return { Vec: val.map(v => nativeToScVal(v)) };
  if (typeof val === 'object') {
    const entries = Object.entries(val);
    return {
      Map: entries.map(([k, v]) => ({
        key: nativeToScVal(k, { type: 'symbol' }),
        val: nativeToScVal(v),
      })),
    };
  }

  throw new Error(`Cannot convert ${typeof val} to SCVal`);
}

export function scValToNative(scval: any): any {
  if (typeof scval === 'string') {
    // void arms
    if (scval === 'Void' || scval === 'LedgerKeyContractInstance') return null;
    return scval;
  }

  // Handle compat ScVal objects with .switch()/.value() methods
  if (typeof scval?.switch === 'function') {
    return scValToNative(scval._toModern ? scval._toModern() : scval);
  }

  if ('Bool' in scval) return scval.Bool;
  if ('U32' in scval) return scval.U32;
  if ('I32' in scval) return scval.I32;
  if ('U64' in scval) return scval.U64;
  if ('I64' in scval) return scval.I64;
  if ('Timepoint' in scval) return scval.Timepoint;
  if ('Duration' in scval) return scval.Duration;
  if ('U128' in scval) return (scval.U128.hi << 64n) | scval.U128.lo;
  if ('I128' in scval) return (scval.I128.hi << 64n) | scval.I128.lo;
  if ('U256' in scval) return scval.U256;
  if ('I256' in scval) return scval.I256;
  if ('Bytes' in scval) return scval.Bytes;
  if ('String' in scval) return scval.String;
  if ('Symbol' in scval) return scval.Symbol;
  if ('Vec' in scval) return scval.Vec!.map(scValToNative);
  if ('Map' in scval) {
    const result: Record<string, any> = {};
    for (const entry of scval.Map!) {
      const key = scValToNative(entry.key);
      result[String(key)] = scValToNative(entry.val);
    }
    return result;
  }
  if ('Address' in scval) return Address.fromScAddress(scval.Address);
  if ('ContractInstance' in scval) return scval.ContractInstance;
  if ('Error' in scval) return scval.Error;

  return scval;
}
