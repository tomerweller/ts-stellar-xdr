/**
 * Sync hashing utilities via @noble/hashes.
 */

import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { encodeBase64 } from '@stellar/xdr';

const encoder = new TextEncoder();

/** Augment a Uint8Array with Buffer-like toString(encoding) */
function augmentBuffer(buf: Uint8Array): any {
  const origToString = buf.toString.bind(buf);
  Object.defineProperty(buf, 'toString', {
    value: (encoding?: string) => {
      if (encoding === 'base64') {
        return encodeBase64(buf);
      }
      if (encoding === 'hex') {
        return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
      }
      if (encoding === 'utf8' || encoding === 'utf-8') {
        return new TextDecoder().decode(buf);
      }
      return origToString();
    },
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return buf;
}

/** Sync SHA-256 hash */
export function hash(data: Uint8Array): any {
  return augmentBuffer(nobleSha256(data));
}

/** Compute network ID (SHA-256 of passphrase) */
export function networkId(passphrase: string): Uint8Array {
  return hash(encoder.encode(passphrase));
}

/** Recursively augment all Uint8Array values in an object */
function augmentBuffersDeep(obj: any): any {
  if (obj instanceof Uint8Array) return augmentBuffer(obj);
  if (Array.isArray(obj)) return obj.map(augmentBuffersDeep);
  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = augmentBuffersDeep(v);
    }
    return result;
  }
  return obj;
}

export { augmentBuffer, augmentBuffersDeep };
