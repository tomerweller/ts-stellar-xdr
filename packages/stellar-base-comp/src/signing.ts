/**
 * Sync hashing utilities via @noble/hashes.
 */

import { sha256 as nobleSha256 } from '@noble/hashes/sha256';

const encoder = new TextEncoder();

/** Sync SHA-256 hash */
export function hash(data: Uint8Array): Uint8Array {
  return nobleSha256(data);
}

/** Compute network ID (SHA-256 of passphrase) */
export function networkId(passphrase: string): Uint8Array {
  return hash(encoder.encode(passphrase));
}
