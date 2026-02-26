import { describe, it, expect } from 'vitest';
import { StrKey } from '../src/strkey.js';

const PUBKEY1 = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';
const SECRET1 = 'SDL2ENWLAB7NHNVZUWTSZO23D3YLF4YUKUBHLWDVHKNDFJ37VDQ2RI53';

describe('StrKey', () => {
  it('validates ed25519 public key', () => {
    expect(StrKey.isValidEd25519PublicKey(PUBKEY1)).toBe(true);
    expect(StrKey.isValidEd25519PublicKey('invalid')).toBe(false);
    expect(StrKey.isValidEd25519PublicKey(SECRET1)).toBe(false);
  });

  it('validates ed25519 secret seed', () => {
    expect(StrKey.isValidEd25519SecretSeed(SECRET1)).toBe(true);
    expect(StrKey.isValidEd25519SecretSeed(PUBKEY1)).toBe(false);
  });

  it('roundtrips ed25519 public key', () => {
    const raw = StrKey.decodeEd25519PublicKey(PUBKEY1);
    expect(raw.length).toBe(32);
    const encoded = StrKey.encodeEd25519PublicKey(raw);
    expect(encoded).toBe(PUBKEY1);
  });

  it('roundtrips ed25519 secret seed', () => {
    const raw = StrKey.decodeEd25519SecretSeed(SECRET1);
    expect(raw.length).toBe(32);
    const encoded = StrKey.encodeEd25519SecretSeed(raw);
    expect(encoded).toBe(SECRET1);
  });
});
