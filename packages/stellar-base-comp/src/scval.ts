/**
 * nativeToScVal / scValToNative — JS ↔ SCVal conversion
 * Compatible with js-stellar-base.
 */

import { Address } from './address.js';
import { Keypair } from './keypair.js';
import { ScVal as CompatScVal } from './generated/stellar_compat.js';
import { ScInt } from './scint-compat.js';

export interface NativeToScValOpts {
  type?: any; // string, object (per-key specs), or array (per-element specs)
}

function wrapCompat(modern: any): any {
  return (CompatScVal as any)._fromModern(modern);
}

// Numeric type strings for ScInt
const NUMERIC_TYPES = new Set([
  'i64', 'u64', 'i128', 'u128', 'i256', 'u256',
  'timepoint', 'duration',
]);

function buildModern(val: any, opts?: NativeToScValOpts): any {
  const type = opts?.type;

  if (val === null || val === undefined) {
    return 'Void';
  }

  // If val is already a compat ScVal (has .switch() method), convert to modern
  if (typeof val?.switch === 'function' && typeof val?._toModern === 'function') {
    return val._toModern();
  }

  // Handle arrays BEFORE string type hints so ['a','b','c'] with type:'symbol'
  // produces a Vec of symbols rather than treating the array as a scalar.
  if (Array.isArray(val)) {
    if (Array.isArray(type)) {
      // Per-element type specs: type[i] applies to val[i], then cycles
      return {
        Vec: val.map((v, i) => {
          const elemType = i < type.length ? type[i] : null;
          return buildModern(v, elemType ? { type: elemType } : undefined);
        }),
      };
    }
    // If type is a string, apply it to all elements
    if (typeof type === 'string') {
      return { Vec: val.map((v: any) => buildModern(v, { type })) };
    }
    return { Vec: val.map((v: any) => buildModern(v)) };
  }

  if (typeof type === 'string') {
    switch (type) {
      case 'bool': return { Bool: Boolean(val) };
      case 'void': return 'Void';
      case 'u32': return { U32: Number(val) };
      case 'i32': return { I32: Number(val) };
      case 'u64':
      case 'i64':
      case 'u128':
      case 'i128':
      case 'u256':
      case 'i256':
      case 'timepoint':
      case 'duration': {
        // Use ScInt for large integer conversion
        const scInt = new ScInt(BigInt(val), { type: type as any });
        const scVal = scInt.toScVal();
        return scVal._toModern();
      }
      case 'bytes': return { Bytes: val instanceof Uint8Array ? val : new TextEncoder().encode(String(val)) };
      case 'string': {
        // Handle Buffer/Uint8Array inputs
        if (val instanceof Uint8Array) {
          return { String: new TextDecoder().decode(val) };
        }
        return { String: String(val) };
      }
      case 'symbol': {
        // Handle Buffer/Uint8Array inputs
        if (val instanceof Uint8Array) {
          return { Symbol: new TextDecoder().decode(val) };
        }
        return { Symbol: String(val) };
      }
      case 'address':
        if (val instanceof Address) return { Address: val.toScAddress()._toModern() };
        if (typeof val === 'string') return { Address: new Address(val).toScAddress()._toModern() };
        return { Address: val };
      default:
        throw new Error(`Unknown ScVal type: ${type}`);
    }
  }

  // Auto-detect type
  if (typeof val === 'boolean') return { Bool: val };
  if (typeof val === 'number' || typeof val === 'bigint') {
    // Match js-stellar-base: numbers/bigints without explicit type go through smallest fit
    const n = BigInt(val);
    if (n >= 0n && n <= 0xFFFFFFFFFFFFFFFFn) return { U64: n };
    if (n < 0n && n >= -0x7FFFFFFFFFFFFFFFn) return { I64: n };
    if (n >= 0n) return { U128: { lo: n & 0xFFFFFFFFFFFFFFFFn, hi: n >> 64n } };
    return { I128: { lo: n & 0xFFFFFFFFFFFFFFFFn, hi: n >> 64n } };
  }
  if (typeof val === 'string') return { String: val };
  if (val instanceof Uint8Array) return { Bytes: val };
  if (val instanceof Address) return { Address: val.toScAddress()._toModern() };

  // Handle Keypair — convert public key to Address ScVal
  if (val instanceof Keypair) {
    return { Address: new Address(val.publicKey()).toScAddress()._toModern() };
  }

  if (typeof val === 'object') {
    // Sort keys lexicographically (Soroban runtime expects sorted maps)
    const keys = Object.keys(val).sort();

    if (typeof type === 'object' && type !== null && !Array.isArray(type)) {
      // Per-key type specs: type[key] = [keyType, valType]
      return {
        Map: keys.map(k => {
          const spec = type[k];
          let keyType: string | null = null;
          let valType: string | null = null;
          if (Array.isArray(spec)) {
            keyType = spec[0] ?? null;
            valType = spec[1] ?? null;
          }
          return {
            key: buildModern(k, keyType ? { type: keyType } : undefined),
            val: buildModern(val[k], valType ? { type: valType } : undefined),
          };
        }),
      };
    }

    return {
      Map: keys.map(k => ({
        key: buildModern(k),
        val: buildModern(val[k]),
      })),
    };
  }

  throw new Error(`Cannot convert ${typeof val} to SCVal`);
}

export function nativeToScVal(val: any, opts?: NativeToScValOpts): any {
  // If the input is already a compat ScVal (has .switch() method), return it as-is.
  // This matches js-stellar-base behavior where passing an xdr.ScVal to nativeToScVal
  // returns it unchanged.
  if (typeof val?.switch === 'function') {
    return val;
  }
  const modern = buildModern(val, opts);
  return wrapCompat(modern);
}

export function scValToNative(scval: any): any {
  // Handle compat ScVal objects with .switch()/.value() methods
  if (typeof scval?.switch === 'function') {
    const modern = scval._toModern ? scval._toModern() : scval;
    return scValToNative(modern);
  }

  if (typeof scval === 'string') {
    // void arms
    if (scval === 'Void' || scval === 'LedgerKeyContractInstance') return null;
    return scval;
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
  if ('U256' in scval) {
    const { hiHi, hiLo, loHi, loLo } = scval.U256;
    return (hiHi << 192n) | (hiLo << 128n) | (loHi << 64n) | loLo;
  }
  if ('I256' in scval) {
    const { hiHi, hiLo, loHi, loLo } = scval.I256;
    return (hiHi << 192n) | (hiLo << 128n) | (loHi << 64n) | loLo;
  }
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
  if ('Address' in scval) return Address.fromScAddress(scval.Address).toString();
  if ('ContractInstance' in scval) return scval.ContractInstance;
  if ('Error' in scval) {
    const err = scval.Error;
    // Handle modern ScError types
    if ('Contract' in err) {
      return { type: 'contract', code: err.Contract };
    }
    // System errors: modern form is { WasmVm: 'InvalidInput' } etc.
    for (const [key, value] of Object.entries(err)) {
      if (key !== 'Contract') {
        const codeStr = value as string;
        const info = ERROR_CODE_INFO[codeStr];
        return {
          type: 'system',
          code: info?.value ?? 0,
          value: info?.name ?? codeStr,
        };
      }
    }
    return err;
  }

  return scval;
}

// Modern ScErrorCode name → { value, compatName } mapping
const ERROR_CODE_INFO: Record<string, { value: number; name: string }> = {
  ArithDomain: { value: 0, name: 'scecArithDomain' },
  IndexBounds: { value: 1, name: 'scecIndexBounds' },
  InvalidInput: { value: 2, name: 'scecInvalidInput' },
  MissingValue: { value: 3, name: 'scecMissingValue' },
  ExistingValue: { value: 4, name: 'scecExistingValue' },
  ExceededLimit: { value: 5, name: 'scecExceededLimit' },
  InvalidAction: { value: 6, name: 'scecInvalidAction' },
  InternalError: { value: 7, name: 'scecInternalError' },
  UnexpectedType: { value: 8, name: 'scecUnexpectedType' },
  UnexpectedSize: { value: 9, name: 'scecUnexpectedSize' },
};
