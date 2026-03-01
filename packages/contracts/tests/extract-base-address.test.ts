import { describe, it, expect } from 'vitest';
import { extractBaseAddress } from '../src/extract-base-address.js';
import { encodeStrkey, STRKEY_ED25519_PUBLIC, STRKEY_MUXED_ED25519 } from '@stellar/xdr';

describe('extractBaseAddress', () => {
  const pubKeyBytes = new Uint8Array(32);
  pubKeyBytes[0] = 0x12;
  pubKeyBytes[31] = 0x34;
  const gAddress = encodeStrkey(STRKEY_ED25519_PUBLIC, pubKeyBytes);

  it('passes through G-address unchanged', () => {
    expect(extractBaseAddress(gAddress)).toBe(gAddress);
  });

  it('extracts G-address from M-address', () => {
    // Muxed payload: 32 bytes ed25519 key + 8 bytes ID
    const muxedPayload = new Uint8Array(40);
    // Set ed25519 key bytes (first 32 bytes)
    muxedPayload.set(pubKeyBytes, 0);
    // Set ID bytes (last 8 bytes)
    muxedPayload[39] = 1; // id = 1

    const mAddress = encodeStrkey(STRKEY_MUXED_ED25519, muxedPayload);
    expect(mAddress).toMatch(/^M/);

    const result = extractBaseAddress(mAddress);
    expect(result).toBe(gAddress);
  });

  it('throws for C-address', () => {
    const contractBytes = new Uint8Array(32);
    const cAddress = encodeStrkey(16, contractBytes); // STRKEY_CONTRACT = 16
    expect(() => extractBaseAddress(cAddress)).toThrow(TypeError);
  });

  it('throws for invalid input', () => {
    expect(() => extractBaseAddress('not-an-address')).toThrow();
  });
});
