import { describe, it, expect } from 'vitest';
import { Keypair } from '../src/keypair.js';

const SECRET1 = 'SDL2ENWLAB7NHNVZUWTSZO23D3YLF4YUKUBHLWDVHKNDFJ37VDQ2RI53';
const PUBKEY1 = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';

describe('Keypair', () => {
  it('creates from secret', () => {
    const kp = Keypair.fromSecret(SECRET1);
    expect(kp.publicKey()).toBe(PUBKEY1);
    expect(kp.secret()).toBe(SECRET1);
    expect(kp.canSign()).toBe(true);
  });

  it('creates from public key', () => {
    const kp = Keypair.fromPublicKey(PUBKEY1);
    expect(kp.publicKey()).toBe(PUBKEY1);
    expect(kp.canSign()).toBe(false);
    expect(() => kp.secret()).toThrow();
  });

  it('generates random keypair', () => {
    const kp = Keypair.random();
    expect(kp.canSign()).toBe(true);
    expect(kp.publicKey()).toMatch(/^G/);
    expect(kp.secret()).toMatch(/^S/);
  });

  it('signs and verifies synchronously', () => {
    const kp = Keypair.fromSecret(SECRET1);
    const data = new Uint8Array([1, 2, 3, 4]);
    const sig = kp.sign(data);
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBe(64);
    expect(kp.verify(data, sig)).toBe(true);
  });

  it('signDecorated returns hint and signature', () => {
    const kp = Keypair.fromSecret(SECRET1);
    const data = new Uint8Array([5, 6, 7, 8]);
    const dec = kp.signDecorated(data);
    expect(dec.hint).toBeInstanceOf(Uint8Array);
    expect(dec.hint.length).toBe(4);
    expect(dec.signature).toBeInstanceOf(Uint8Array);
    expect(dec.signature.length).toBe(64);
  });

  it('signatureHint returns last 4 bytes of public key', () => {
    const kp = Keypair.fromSecret(SECRET1);
    const hint = kp.signatureHint();
    const raw = kp.rawPublicKey();
    expect(hint).toEqual(raw.slice(-4));
  });
});
