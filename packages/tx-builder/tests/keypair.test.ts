import { describe, it, expect } from 'vitest';
import { Keypair } from '../src/keypair.js';

describe('Keypair', () => {
  const testSecret = 'SDL2ENWLAB7NHNVZUWTSZO23D3YLF4YUKUBHLWDVHKNDFJ37VDQ2RI53';
  const testPublic = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';

  describe('random', () => {
    it('generates a random keypair that can sign', async () => {
      const kp = await Keypair.random();
      expect(kp.canSign()).toBe(true);
      expect(kp.publicKey).toMatch(/^G/);
      expect(kp.secret).toMatch(/^S/);
      expect(kp.rawPublicKey.length).toBe(32);
      expect(kp.rawSecretKey.length).toBe(32);
    });

    it('generates different keypairs each time', async () => {
      const kp1 = await Keypair.random();
      const kp2 = await Keypair.random();
      expect(kp1.publicKey).not.toBe(kp2.publicKey);
    });
  });

  describe('fromSecret', () => {
    it('derives correct public key from secret', async () => {
      const kp = await Keypair.fromSecret(testSecret);
      expect(kp.publicKey).toBe(testPublic);
      expect(kp.secret).toBe(testSecret);
      expect(kp.canSign()).toBe(true);
    });

    it('rejects non-S-address', async () => {
      await expect(Keypair.fromSecret(testPublic)).rejects.toThrow();
    });
  });

  describe('fromRawSecret', () => {
    it('derives correct public key', async () => {
      const kp1 = await Keypair.fromSecret(testSecret);
      const kp2 = await Keypair.fromRawSecret(kp1.rawSecretKey);
      expect(kp2.publicKey).toBe(testPublic);
    });

    it('rejects wrong length', async () => {
      await expect(Keypair.fromRawSecret(new Uint8Array(16))).rejects.toThrow('32 bytes');
    });
  });

  describe('fromPublicKey', () => {
    it('creates a public-only keypair', () => {
      const kp = Keypair.fromPublicKey(testPublic);
      expect(kp.publicKey).toBe(testPublic);
      expect(kp.canSign()).toBe(false);
    });

    it('throws when accessing secret', () => {
      const kp = Keypair.fromPublicKey(testPublic);
      expect(() => kp.secret).toThrow('No secret key');
    });

    it('throws when trying to sign', async () => {
      const kp = Keypair.fromPublicKey(testPublic);
      await expect(kp.sign(new Uint8Array(32))).rejects.toThrow('Cannot sign');
    });

    it('rejects non-G-address', () => {
      expect(() => Keypair.fromPublicKey(testSecret)).toThrow('G-address');
    });
  });

  describe('fromRawPublicKey', () => {
    it('creates a public-only keypair', () => {
      const kp1 = Keypair.fromPublicKey(testPublic);
      const kp2 = Keypair.fromRawPublicKey(kp1.rawPublicKey);
      expect(kp2.publicKey).toBe(testPublic);
      expect(kp2.canSign()).toBe(false);
    });

    it('rejects wrong length', () => {
      expect(() => Keypair.fromRawPublicKey(new Uint8Array(16))).toThrow('32 bytes');
    });
  });

  describe('sign and verify', () => {
    it('signs and verifies data', async () => {
      const kp = await Keypair.fromSecret(testSecret);
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const sig = await kp.sign(data);
      expect(sig.length).toBe(64);
      expect(await kp.verify(data, sig)).toBe(true);
    });

    it('rejects invalid signature', async () => {
      const kp = await Keypair.fromSecret(testSecret);
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const sig = await kp.sign(data);
      sig[0] ^= 0xff; // corrupt signature
      expect(await kp.verify(data, sig)).toBe(false);
    });

    it('verifies with public-only keypair', async () => {
      const full = await Keypair.fromSecret(testSecret);
      const pubOnly = Keypair.fromPublicKey(testPublic);
      const data = new Uint8Array([10, 20, 30]);
      const sig = await full.sign(data);
      expect(await pubOnly.verify(data, sig)).toBe(true);
    });
  });

  describe('signDecorated', () => {
    it('returns hint and signature', async () => {
      const kp = await Keypair.fromSecret(testSecret);
      const data = new Uint8Array([1, 2, 3]);
      const dec = await kp.signDecorated(data);
      expect(dec.hint.length).toBe(4);
      expect(dec.signature.length).toBe(64);
      expect(dec.hint).toEqual(kp.signatureHint());
    });
  });

  describe('signatureHint', () => {
    it('returns last 4 bytes of public key', () => {
      const kp = Keypair.fromPublicKey(testPublic);
      const hint = kp.signatureHint();
      expect(hint.length).toBe(4);
      expect(hint).toEqual(kp.rawPublicKey.slice(-4));
    });
  });

  describe('toMuxedAccount and toAccountId', () => {
    it('toMuxedAccount returns Ed25519 arm', () => {
      const kp = Keypair.fromPublicKey(testPublic);
      const muxed = kp.toMuxedAccount();
      expect('Ed25519' in muxed).toBe(true);
    });

    it('toAccountId returns PublicKeyTypeEd25519 arm', () => {
      const kp = Keypair.fromPublicKey(testPublic);
      const aid = kp.toAccountId();
      expect('PublicKeyTypeEd25519' in aid).toBe(true);
    });
  });
});
