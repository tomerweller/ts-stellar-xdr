/**
 * Memo class compatible with js-stellar-base.
 */

import {
  memoNone,
  memoText,
  memoId,
  memoHash,
  memoReturn,
  type Memo as ModernMemo,
} from '@stellar/tx-builder';
import { is, XdrWriter } from '@stellar/xdr';
import { Memo as CompatMemoXdr } from './generated/stellar_compat.js';
import { UnsignedHyper } from './xdr-compat/hyper.js';
import { augmentBuffer } from './signing.js';

export type MemoType = 'none' | 'text' | 'id' | 'hash' | 'return';

const VALID_TYPES = new Set<string>(['none', 'text', 'id', 'hash', 'return']);

// Use Buffer if available (Node.js), otherwise fall back to Uint8Array
const hasBuffer = typeof globalThis.Buffer !== 'undefined';
function toBuffer(data: Uint8Array): any {
  if (hasBuffer) return globalThis.Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return augmentBuffer(new Uint8Array(data));
}

export class Memo<T extends MemoType = MemoType> {
  readonly type: MemoType;
  readonly value: any;

  constructor(type: MemoType, value?: any) {
    if (!VALID_TYPES.has(type)) {
      throw new Error(`Invalid memo type`);
    }
    this.type = type;
    switch (type) {
      case 'none':
        this.value = null;
        break;
      case 'text':
        if (value === undefined || value === null) {
          this.value = '';
        } else if (typeof value === 'string') {
          const bytes = new TextEncoder().encode(value);
          if (bytes.length > 28) {
            throw new Error('Expects string, array or buffer, max 28 bytes');
          }
          this.value = value;
        } else if (value instanceof Uint8Array) {
          // Accept Buffer/Uint8Array — preserve original
          if (value.length > 28) {
            throw new Error('Expects string, array or buffer, max 28 bytes');
          }
          this.value = value;
        } else if (Array.isArray(value)) {
          // Accept plain arrays (like [0xd1])
          if (value.length > 28) {
            throw new Error('Expects string, array or buffer, max 28 bytes');
          }
          this.value = value;
        } else {
          throw new Error('Expects string, array or buffer, max 28 bytes');
        }
        break;
      case 'id':
        if (value === undefined || value === null) {
          throw new Error('Expects a int64 as a string. Got undefined');
        }
        try {
          const bi = BigInt(value as any);
          if (bi < 0n || bi > 18446744073709551615n) {
            throw new Error('Memo ID must be a uint64');
          }
          this.value = bi.toString();
        } catch (e: any) {
          if (e.message.includes('Memo ID')) throw e;
          throw new Error(`Expects a int64 as a string. Got ${typeof value}`);
        }
        break;
      case 'hash':
      case 'return': {
        if (value === undefined || value === null) {
          throw new Error('Expects a 32 byte hash value or hex encoded string. Got undefined');
        }
        let bytes: Uint8Array;
        if (typeof value === 'string') {
          bytes = hexToBytes(value);
        } else if (value instanceof Uint8Array) {
          bytes = value;
        } else {
          throw new Error('Expects a 32 byte hash value or hex encoded string. Got ' + typeof value);
        }
        if (bytes.length !== 32) {
          throw new Error('Expects a 32 byte hash value or hex encoded string. Got ' + bytes.length + ' bytes instead.');
        }
        // Store as Buffer for compat (supports .toString('hex'), .equals(), Buffer.isBuffer())
        this.value = toBuffer(bytes);
        break;
      }
    }
  }

  static none(): Memo {
    return new Memo('none');
  }

  static text(text?: any): Memo {
    if (arguments.length === 0) {
      throw new Error('Expects string, array or buffer, max 28 bytes');
    }
    return new Memo('text', text);
  }

  static id(id?: any): Memo {
    if (arguments.length === 0) {
      throw new Error('Expects a int64 as a string. Got undefined');
    }
    return new Memo('id', id);
  }

  static hash(hash?: any): Memo {
    if (arguments.length === 0) {
      throw new Error('Expects a 32 byte hash value or hex encoded string. Got undefined');
    }
    return new Memo('hash', hash);
  }

  static return(hash?: any): Memo {
    if (arguments.length === 0) {
      throw new Error('Expects a 32 byte hash value or hex encoded string. Got undefined');
    }
    return new Memo('return', hash);
  }

  _toModern(): ModernMemo {
    switch (this.type) {
      case 'none':
        return memoNone();
      case 'text': {
        const val = this.value;
        if (typeof val === 'string') {
          return memoText(val);
        }
        // For byte values (Buffer/array), convert to a Latin-1 string
        // where each byte maps directly to a character codepoint.
        // This preserves raw bytes through the modern text memo system.
        const bytes = val instanceof Uint8Array ? val : new Uint8Array(val);
        return memoText(String.fromCharCode(...bytes));
      }
      case 'id':
        return memoId(BigInt(this.value as string));
      case 'hash':
        return memoHash(this.value instanceof Uint8Array ? this.value : new Uint8Array(this.value));
      case 'return':
        return memoReturn(this.value instanceof Uint8Array ? this.value : new Uint8Array(this.value));
    }
  }

  toXDRObject(): any {
    // For text memos with non-string values (Buffer/array), construct the compat
    // memo directly with the original value so that .text() and .value() return it.
    // We also override toXDR to encode raw bytes (not UTF-8 string encoding).
    if (this.type === 'text' && typeof this.value !== 'string') {
      const compat = (CompatMemoXdr as any).memoText(this.value);
      const rawBytes = this.value instanceof Uint8Array
        ? this.value
        : new Uint8Array(this.value);
      // Override toXDR to encode raw bytes directly, bypassing UTF-8 string encoding
      compat.toXDR = function(format?: string) {
        const writer = new XdrWriter();
        // Write discriminant: memo_text = 1
        writer.writeInt32(1);
        // Write var opaque: length-prefixed raw bytes
        writer.writeVarOpaque(rawBytes);
        const bytes = writer.toUint8Array();
        if (!format || format === 'raw') return augmentBuffer(bytes);
        if (format === 'hex') return Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join('');
        if (format === 'base64') return btoa(String.fromCharCode(...bytes));
        throw new Error(`Unknown format: ${format}`);
      };
      return compat;
    }
    return (CompatMemoXdr as any)._fromModern(this._toModern());
  }

  static fromXDRObject(xdrMemo: any): Memo {
    // If it's a compat XDR object, extract values directly to preserve types
    if (xdrMemo && typeof xdrMemo.switch === 'function') {
      const sw = xdrMemo.switch();
      const name = typeof sw === 'string' ? sw : sw.name;
      switch (name) {
        case 'memoNone':
          return Memo.none();
        case 'memoText':
          return new Memo('text', xdrMemo.text());
        case 'memoId':
          return Memo.id(xdrMemo.id().toString());
        case 'memoHash':
          return Memo.hash(xdrMemo.hash());
        case 'memoReturn':
          return Memo.return(xdrMemo.retHash());
      }
    }
    // Fallback: treat as modern
    const modern: ModernMemo = xdrMemo._toModern ? xdrMemo._toModern() : xdrMemo;
    return Memo._fromModern(modern);
  }

  static _fromModern(modern: ModernMemo): Memo {
    if (modern === 'None') return Memo.none();
    if (is(modern, 'Text')) return Memo.text(modern.Text);
    if (is(modern, 'Id')) return Memo.id(modern.Id.toString());
    if (is(modern, 'Hash')) return Memo.hash(modern.Hash);
    if (is(modern, 'Return')) return Memo.return(modern.Return);
    throw new Error('Unknown memo type');
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
