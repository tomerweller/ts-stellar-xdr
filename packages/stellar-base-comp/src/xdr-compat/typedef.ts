/**
 * createCompatTypedef — wrapper for simple typedefs (opaque, string, etc.)
 * that need toXDR/fromXDR but don't need getter/setter methods.
 */

import type { XdrCodec } from '@stellar/xdr';
import { XdrTypeBase } from './base.js';
import type { Converter } from './converters.js';

export interface CompatTypedefConfig<C, M> {
  codec: XdrCodec<M>;
  convert: Converter<C, M>;
}

export interface CompatTypedefClass<C> {
  _codec: XdrCodec<any>;
  _fromModern(modern: any): C;
  toXDR(value: C, format?: string): Uint8Array | string;
  fromXDR(input: Uint8Array | string, format?: string): C;
  validateXDR(input: Uint8Array | string, format?: string): boolean;
}

/**
 * For simple typedefs, we don't create class instances — we just provide
 * static encode/decode methods. Returns a namespace-like object.
 */
export function createCompatTypedef<C, M>(config: CompatTypedefConfig<C, M>): CompatTypedefClass<C> {
  const { codec, convert } = config;

  return {
    _codec: codec,

    _fromModern(modern: M): C {
      return convert.toCompat(modern);
    },

    toXDR(value: C, format?: string): Uint8Array | string {
      const modern = convert.toModern(value);
      const bytes = codec.toXdr(modern);
      if (!format || format === 'raw') return bytes;
      if (format === 'hex') {
        let hex = '';
        for (let i = 0; i < bytes.length; i++) {
          hex += bytes[i]!.toString(16).padStart(2, '0');
        }
        return hex;
      }
      if (format === 'base64') return codec.toBase64(modern);
      throw new Error(`Unknown format: ${format}`);
    },

    fromXDR(input: Uint8Array | string, format?: string): C {
      let modern: M;
      if (typeof input === 'string') {
        if (format === 'hex') {
          const bytes = new Uint8Array(input.length / 2);
          for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(input.slice(i * 2, i * 2 + 2), 16);
          }
          modern = codec.fromXdr(bytes);
        } else {
          modern = codec.fromBase64(input);
        }
      } else {
        modern = codec.fromXdr(input);
      }
      return convert.toCompat(modern);
    },

    validateXDR(input: Uint8Array | string, format?: string): boolean {
      try {
        this.fromXDR(input, format);
        return true;
      } catch {
        return false;
      }
    },
  };
}
