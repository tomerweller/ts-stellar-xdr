import { describe, it, expect } from 'vitest';
import { LiquidityPoolAsset, type AssetLike } from '../src/liquidity-pool-asset.js';

describe('LiquidityPoolAsset', () => {
  const native: AssetLike = { code: 'XLM' };
  const usdc: AssetLike = {
    code: 'USDC',
    issuer: 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC',
  };

  describe('constructor', () => {
    it('creates with two assets', () => {
      const lpa = new LiquidityPoolAsset(native, usdc);
      expect(lpa.assetA).toBe(native);
      expect(lpa.assetB).toBe(usdc);
      expect(lpa.fee).toBe(30);
    });

    it('accepts custom fee', () => {
      const lpa = new LiquidityPoolAsset(native, usdc, 50);
      expect(lpa.fee).toBe(50);
    });

    it('rejects wrong order (same type)', () => {
      const abc: AssetLike = {
        code: 'ABC',
        issuer: 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC',
      };
      expect(() => new LiquidityPoolAsset(usdc, abc)).toThrow(
        'lexicographic order',
      );
    });

    it('rejects same asset', () => {
      expect(() => new LiquidityPoolAsset(native, native)).toThrow(
        'lexicographic order',
      );
    });

    it('rejects reversed native/credit order', () => {
      expect(() => new LiquidityPoolAsset(usdc, native)).toThrow(
        'lexicographic order',
      );
    });
  });

  describe('getAssetType', () => {
    it('returns liquidity_pool_shares', () => {
      const lpa = new LiquidityPoolAsset(native, usdc);
      expect(lpa.getAssetType()).toBe('liquidity_pool_shares');
    });
  });

  describe('getLiquidityPoolParameters', () => {
    it('returns parameters', () => {
      const lpa = new LiquidityPoolAsset(native, usdc);
      const params = lpa.getLiquidityPoolParameters();
      expect(params.assetA).toBe(native);
      expect(params.assetB).toBe(usdc);
      expect(params.fee).toBe(30);
    });
  });

  describe('toString', () => {
    it('formats as string', () => {
      const lpa = new LiquidityPoolAsset(native, usdc);
      expect(lpa.toString()).toMatch(/^liquidity_pool:native:USDC:/);
    });
  });

  describe('equals', () => {
    it('compares equal assets', () => {
      const a = new LiquidityPoolAsset(native, usdc);
      const b = new LiquidityPoolAsset(native, usdc);
      expect(a.equals(b)).toBe(true);
    });

    it('detects different fees', () => {
      const a = new LiquidityPoolAsset(native, usdc, 30);
      const b = new LiquidityPoolAsset(native, usdc, 50);
      expect(a.equals(b)).toBe(false);
    });
  });
});
