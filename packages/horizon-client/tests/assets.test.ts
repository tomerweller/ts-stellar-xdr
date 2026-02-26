import { describe, it, expect } from 'vitest';
import { native, credit, assetParams, assetString, assetList } from '../src/assets.js';

describe('native()', () => {
  it('returns native asset', () => {
    expect(native()).toEqual({ type: 'native' });
  });
});

describe('credit()', () => {
  it('returns credit_alphanum4 for short codes', () => {
    expect(credit('USD', 'GISSUER')).toEqual({
      type: 'credit_alphanum4',
      code: 'USD',
      issuer: 'GISSUER',
    });
  });

  it('returns credit_alphanum4 for 4-char codes', () => {
    expect(credit('USDC', 'GISSUER').type).toBe('credit_alphanum4');
  });

  it('returns credit_alphanum12 for codes longer than 4', () => {
    expect(credit('LONGCODE', 'GISSUER')).toEqual({
      type: 'credit_alphanum12',
      code: 'LONGCODE',
      issuer: 'GISSUER',
    });
  });
});

describe('assetParams()', () => {
  it('encodes native asset with prefix', () => {
    expect(assetParams('selling', native())).toEqual({
      selling_asset_type: 'native',
    });
  });

  it('encodes credit asset with prefix', () => {
    expect(assetParams('buying', credit('USD', 'GISSUER'))).toEqual({
      buying_asset_type: 'credit_alphanum4',
      buying_asset_code: 'USD',
      buying_asset_issuer: 'GISSUER',
    });
  });

  it('works with different prefixes', () => {
    const result = assetParams('base', credit('EUR', 'GTEST'));
    expect(result).toHaveProperty('base_asset_type');
    expect(result).toHaveProperty('base_asset_code');
    expect(result).toHaveProperty('base_asset_issuer');
  });
});

describe('assetString()', () => {
  it('returns "native" for native asset', () => {
    expect(assetString(native())).toBe('native');
  });

  it('returns "CODE:ISSUER" for credit asset', () => {
    expect(assetString(credit('USD', 'GISSUER'))).toBe('USD:GISSUER');
  });
});

describe('assetList()', () => {
  it('returns comma-separated asset strings', () => {
    const result = assetList([native(), credit('USD', 'G1'), credit('EUR', 'G2')]);
    expect(result).toBe('native,USD:G1,EUR:G2');
  });

  it('returns single asset string', () => {
    expect(assetList([native()])).toBe('native');
  });

  it('returns empty string for empty array', () => {
    expect(assetList([])).toBe('');
  });
});
