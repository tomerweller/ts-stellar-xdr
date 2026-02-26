import { describe, it, expect } from 'vitest';
import { is } from '@stellar/xdr';
import {
  parsePublicKey,
  parseMuxedAccount,
  nativeAsset,
  creditAsset,
  memoNone,
  memoText,
  memoId,
  memoHash,
  memoReturn,
} from '../src/helpers.js';

const TEST_PUBKEY = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';

describe('helpers', () => {
  describe('parsePublicKey', () => {
    it('parses a G-address to AccountID', () => {
      const aid = parsePublicKey(TEST_PUBKEY);
      expect('PublicKeyTypeEd25519' in aid).toBe(true);
      if ('PublicKeyTypeEd25519' in aid) {
        expect(aid.PublicKeyTypeEd25519.length).toBe(32);
      }
    });

    it('rejects non-G-address', () => {
      expect(() => parsePublicKey('SDL2ENWLAB7NHNVZUWTSZO23D3YLF4YUKUBHLWDVHKNDFJ37VDQ2RI53')).toThrow();
    });
  });

  describe('parseMuxedAccount', () => {
    it('parses a G-address to Ed25519 arm', () => {
      const muxed = parseMuxedAccount(TEST_PUBKEY);
      expect('Ed25519' in muxed).toBe(true);
    });

    it('rejects invalid address', () => {
      expect(() => parseMuxedAccount('INVALID')).toThrow();
    });
  });

  describe('nativeAsset', () => {
    it('returns Native string', () => {
      expect(nativeAsset()).toBe('Native');
    });
  });

  describe('creditAsset', () => {
    it('creates CreditAlphanum4 for short codes', () => {
      const asset = creditAsset('USD', TEST_PUBKEY);
      expect(is(asset, 'CreditAlphanum4')).toBe(true);
      if (is(asset, 'CreditAlphanum4')) {
        // Check that code is padded to 4 bytes
        expect(asset.CreditAlphanum4.assetCode.length).toBe(4);
        // First 3 bytes are 'USD', last byte is 0
        expect(asset.CreditAlphanum4.assetCode[3]).toBe(0);
      }
    });

    it('creates CreditAlphanum12 for long codes', () => {
      const asset = creditAsset('LONGASSET', TEST_PUBKEY);
      expect(is(asset, 'CreditAlphanum12')).toBe(true);
      if (is(asset, 'CreditAlphanum12')) {
        expect(asset.CreditAlphanum12.assetCode.length).toBe(12);
      }
    });

    it('rejects empty code', () => {
      expect(() => creditAsset('', TEST_PUBKEY)).toThrow();
    });

    it('rejects code > 12 chars', () => {
      expect(() => creditAsset('TOOLONGASSETCD', TEST_PUBKEY)).toThrow();
    });
  });

  describe('memo helpers', () => {
    it('memoNone returns None', () => {
      expect(memoNone()).toBe('None');
    });

    it('memoText creates Text memo', () => {
      const memo = memoText('hello');
      expect(is(memo, 'Text')).toBe(true);
      if (is(memo, 'Text')) {
        expect(memo.Text).toBe('hello');
      }
    });

    it('memoText rejects > 28 bytes', () => {
      expect(() => memoText('a'.repeat(29))).toThrow('28 bytes');
    });

    it('memoId creates Id memo', () => {
      const memo = memoId(12345n);
      expect(is(memo, 'Id')).toBe(true);
      if (is(memo, 'Id')) {
        expect(memo.Id).toBe(12345n);
      }
    });

    it('memoId rejects negative', () => {
      expect(() => memoId(-1n)).toThrow('uint64');
    });

    it('memoHash creates Hash memo', () => {
      const hash = new Uint8Array(32).fill(0xab);
      const memo = memoHash(hash);
      expect(is(memo, 'Hash')).toBe(true);
    });

    it('memoHash rejects wrong length', () => {
      expect(() => memoHash(new Uint8Array(16))).toThrow('32 bytes');
    });

    it('memoReturn creates Return memo', () => {
      const hash = new Uint8Array(32).fill(0xcd);
      const memo = memoReturn(hash);
      expect(is(memo, 'Return')).toBe(true);
    });

    it('memoReturn rejects wrong length', () => {
      expect(() => memoReturn(new Uint8Array(64))).toThrow('32 bytes');
    });
  });
});
