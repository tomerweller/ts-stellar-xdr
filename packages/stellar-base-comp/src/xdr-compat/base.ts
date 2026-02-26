import type { XdrCodec } from '@stellar/xdr';

/**
 * Base class for all compat XDR types. Provides toXDR/fromXDR/validateXDR
 * methods that delegate to the underlying modern XdrCodec.
 */
export abstract class XdrTypeBase {
  abstract _toModern(): unknown;

  toXDR(format?: 'raw'): Uint8Array;
  toXDR(format: 'hex'): string;
  toXDR(format: 'base64'): string;
  toXDR(format?: string): Uint8Array | string {
    const codec = (this.constructor as any)._codec as XdrCodec<any>;
    const modern = this._toModern();
    const bytes = codec.toXdr(modern);
    if (!format || format === 'raw') return bytes;
    if (format === 'hex') return bytesToHex(bytes);
    if (format === 'base64') return codec.toBase64(modern);
    throw new Error(`Unknown format: ${format}`);
  }

  static fromXDR(input: Uint8Array | string, format?: string): any {
    const codec = (this as any)._codec as XdrCodec<any>;
    const fromModern = (this as any)._fromModern as (v: any) => any;
    let modern: any;
    if (typeof input === 'string') {
      if (format === 'hex') {
        modern = codec.fromXdr(hexToBytes(input));
      } else {
        // default string format is base64
        modern = codec.fromBase64(input);
      }
    } else {
      modern = codec.fromXdr(input);
    }
    return fromModern(modern);
  }

  static validateXDR(input: Uint8Array | string, format?: string): boolean {
    try {
      (this as any).fromXDR(input, format);
      return true;
    } catch {
      return false;
    }
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
