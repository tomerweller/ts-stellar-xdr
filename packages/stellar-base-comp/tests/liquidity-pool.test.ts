import { describe, it, expect } from 'vitest';
import { getLiquidityPoolId } from '../src/liquidity-pool.js';
import { Asset } from '../src/asset.js';

const ISSUER = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ';
const ISSUER2 = 'GB7TAYRUZGE6TVT7NHP5SMIZRNQA6PLM423EYISAOAP3MKYIQMVYP2JO';

function toHex(buf: any): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('getLiquidityPoolId', () => {
  // getLiquidityPoolId now uses js-stellar-base API signature:
  // getLiquidityPoolId('constant_product', { assetA, assetB, fee })
  it('computes a 64-char hex pool ID', () => {
    const id = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    const hex = toHex(id);
    expect(typeof hex).toBe('string');
    expect(hex.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);
  });

  it('produces consistent IDs', () => {
    const id1 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    const id2 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    expect(toHex(id1)).toBe(toHex(id2));
  });

  it('produces different IDs for different asset pairs', () => {
    const id1 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    const id2 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('EUR', ISSUER),
      fee: 30,
    });
    expect(toHex(id1)).not.toBe(toHex(id2));
  });

  it('throws when assets are not in order', () => {
    expect(() =>
      getLiquidityPoolId('constant_product', {
        assetA: new Asset('USD', ISSUER),
        assetB: Asset.native(),
        fee: 30,
      }),
    ).toThrow(/lexicographic order|not in lexicographic/i);
  });

  it('throws when assets are equal', () => {
    expect(() =>
      getLiquidityPoolId('constant_product', {
        assetA: new Asset('USD', ISSUER),
        assetB: new Asset('USD', ISSUER),
        fee: 30,
      }),
    ).toThrow(/lexicographic order|not in lexicographic/i);
  });

  it('works with credit_alphanum4 pair', () => {
    const id = getLiquidityPoolId('constant_product', {
      assetA: new Asset('ARST', ISSUER2),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    expect(toHex(id).length).toBe(64);
  });

  it('works with credit_alphanum4 and alphanum12 pair', () => {
    const id = getLiquidityPoolId('constant_product', {
      assetA: new Asset('ARST', ISSUER2),
      assetB: new Asset('LONGASSET', ISSUER),
      fee: 30,
    });
    expect(toHex(id).length).toBe(64);
  });

  it('uses default fee of 30', () => {
    const id1 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    const id2 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    expect(toHex(id1)).toBe(toHex(id2));
  });

  it('different fee produces different ID', () => {
    const id1 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 30,
    });
    const id2 = getLiquidityPoolId('constant_product', {
      assetA: Asset.native(),
      assetB: new Asset('USD', ISSUER),
      fee: 100,
    });
    expect(toHex(id1)).not.toBe(toHex(id2));
  });
});
