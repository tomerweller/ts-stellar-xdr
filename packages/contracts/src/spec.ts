/**
 * Spec — contract specification parser.
 */

import {
  SCSpecEntry,
  is,
  type SCSpecFunctionV0,
  type SCSpecTypeDef,
} from '@stellar/xdr';

/**
 * Represents a parsed Soroban contract specification.
 */
export class Spec {
  readonly entries: readonly any[];

  constructor(entries: readonly any[]) {
    this.entries = entries;
  }

  /**
   * Parse spec entries from raw XDR buffers (e.g. from WASM custom sections).
   */
  static fromEntryXdrs(xdrs: readonly Uint8Array[]): Spec {
    const entries = xdrs.map((buf) => SCSpecEntry.fromXdr(buf));
    return new Spec(entries);
  }

  /**
   * Get all function spec entries.
   */
  funcs(): readonly SCSpecFunctionV0[] {
    const result: SCSpecFunctionV0[] = [];
    for (const entry of this.entries) {
      if (is(entry, 'FunctionV0')) {
        result.push(entry.FunctionV0);
      }
    }
    return result;
  }

  /**
   * Find a function by name.
   */
  getFunc(name: string): SCSpecFunctionV0 | undefined {
    for (const entry of this.entries) {
      if (is(entry, 'FunctionV0') && entry.FunctionV0.name === name) {
        return entry.FunctionV0;
      }
    }
    return undefined;
  }

  /**
   * Generate a JSON-schema-like description of the contract interface.
   */
  jsonSchema(): Record<string, unknown> {
    const functions: Record<string, unknown> = {};
    for (const fn of this.funcs()) {
      functions[fn.name] = {
        doc: fn.doc || undefined,
        inputs: fn.inputs.map((input) => ({
          name: input.name,
          type: specTypeToJson(input.type),
          doc: input.doc || undefined,
        })),
        outputs: fn.outputs.map(specTypeToJson),
      };
    }
    return { functions };
  }
}

function specTypeToJson(typ: SCSpecTypeDef): unknown {
  if (typeof typ === 'string') return typ;
  if (is(typ, 'Option'))
    return { type: 'Option', valueType: specTypeToJson(typ.Option.valueType) };
  if (is(typ, 'Result'))
    return {
      type: 'Result',
      okType: specTypeToJson(typ.Result.okType),
      errorType: specTypeToJson(typ.Result.errorType),
    };
  if (is(typ, 'Vec'))
    return { type: 'Vec', elementType: specTypeToJson(typ.Vec.elementType) };
  if (is(typ, 'Map'))
    return {
      type: 'Map',
      keyType: specTypeToJson(typ.Map.keyType),
      valueType: specTypeToJson(typ.Map.valueType),
    };
  if (is(typ, 'Tuple'))
    return {
      type: 'Tuple',
      valueTypes: typ.Tuple.valueTypes.map(specTypeToJson),
    };
  if (is(typ, 'BytesN')) return { type: 'BytesN', n: typ.BytesN.n };
  if (is(typ, 'Udt')) return { type: 'Udt', name: typ.Udt.name };
  return 'unknown';
}
