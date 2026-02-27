import { describe, it, expect } from 'vitest';
import { getAssetContractId } from '../src/asset-contract-id.js';
import type { Asset } from '@stellar/xdr';

const TEST_NETWORK = 'Test SDF Network ; September 2015';
const PUBLIC_NETWORK = 'Public Global Stellar Network ; September 2015';

describe('getAssetContractId', () => {
  it('computes contract ID for native asset on testnet', () => {
    const asset: Asset = 'Native';
    const cAddress = getAssetContractId(asset, TEST_NETWORK);
    expect(cAddress).toMatch(/^C[A-Z2-7]{55}$/);
    // Contract ID is deterministic for same asset + network
    expect(getAssetContractId(asset, TEST_NETWORK)).toBe(cAddress);
  });

  it('computes contract ID for native asset on pubnet', () => {
    const asset: Asset = 'Native';
    const cPubnet = getAssetContractId(asset, PUBLIC_NETWORK);
    const cTestnet = getAssetContractId(asset, TEST_NETWORK);
    expect(cPubnet).toMatch(/^C[A-Z2-7]{55}$/);
    // Different networks produce different contract IDs
    expect(cPubnet).not.toBe(cTestnet);
  });

  it('computes contract ID for credit_alphanum4 asset', () => {
    // Create a USDC-like asset
    const issuerBytes = new Uint8Array(32);
    issuerBytes[0] = 0xab;
    issuerBytes[31] = 0xcd;
    const code = new TextEncoder().encode('USDC');
    const asset: Asset = {
      CreditAlphanum4: {
        assetCode: code,
        issuer: { PublicKeyTypeEd25519: issuerBytes },
      },
    };

    const cAddress = getAssetContractId(asset, TEST_NETWORK);
    expect(cAddress).toMatch(/^C[A-Z2-7]{55}$/);
  });

  it('computes contract ID for credit_alphanum12 asset', () => {
    const issuerBytes = new Uint8Array(32);
    issuerBytes[0] = 0x01;
    const encoder = new TextEncoder();
    const code = new Uint8Array(12);
    code.set(encoder.encode('LONGASSET'));

    const asset: Asset = {
      CreditAlphanum12: {
        assetCode: code,
        issuer: { PublicKeyTypeEd25519: issuerBytes },
      },
    };

    const cAddress = getAssetContractId(asset, TEST_NETWORK);
    expect(cAddress).toMatch(/^C[A-Z2-7]{55}$/);
  });

  it('produces known contract ID for native asset on testnet', () => {
    // Known value: native asset on testnet
    // This value matches the official SDK's computation
    const asset: Asset = 'Native';
    const cAddress = getAssetContractId(asset, TEST_NETWORK);
    // The native asset contract ID on testnet is well-known
    expect(cAddress).toBe('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC');
  });
});
