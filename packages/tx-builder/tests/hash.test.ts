import { describe, it, expect } from 'vitest';
import { sha256, networkId, transactionHash } from '../src/hash.js';
import { Networks } from '../src/networks.js';
import { bytesToHex } from '@stellar/xdr';

describe('hash', () => {
  describe('sha256', () => {
    it('hashes empty data', async () => {
      const hash = await sha256(new Uint8Array(0));
      expect(bytesToHex(hash)).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
    });

    it('hashes "hello"', async () => {
      const encoder = new TextEncoder();
      const hash = await sha256(encoder.encode('hello'));
      expect(bytesToHex(hash)).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      );
    });
  });

  describe('networkId', () => {
    it('hashes testnet passphrase', async () => {
      const nid = await networkId(Networks.TESTNET);
      expect(nid.length).toBe(32);
      expect(bytesToHex(nid)).toBe(
        'cee0302d59844d32bdca915c8203dd44b33fbb7edc19051ea37abedf28ecd472',
      );
    });

    it('hashes public passphrase', async () => {
      const nid = await networkId(Networks.PUBLIC);
      expect(nid.length).toBe(32);
      expect(bytesToHex(nid)).toBe(
        '7ac33997544e3175d266bd022439b22cdb16508c01163f26e5cb2a3e1045a979',
      );
    });
  });
});
