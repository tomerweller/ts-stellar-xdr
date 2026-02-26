import { describe, it, expect } from 'vitest';
import { Asset } from '../src/asset.js';

const ISSUER = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';

describe('Asset', () => {
  it('creates native asset', () => {
    const a = Asset.native();
    expect(a.isNative()).toBe(true);
    expect(a.getCode()).toBe('XLM');
    expect(a.getIssuer()).toBeUndefined();
    expect(a.getAssetType()).toBe('native');
  });

  it('creates credit_alphanum4 asset', () => {
    const a = new Asset('USD', ISSUER);
    expect(a.isNative()).toBe(false);
    expect(a.getCode()).toBe('USD');
    expect(a.getIssuer()).toBe(ISSUER);
    expect(a.getAssetType()).toBe('credit_alphanum4');
  });

  it('creates credit_alphanum12 asset', () => {
    const a = new Asset('LONGASSET', ISSUER);
    expect(a.getAssetType()).toBe('credit_alphanum12');
  });

  it('throws on non-native without issuer', () => {
    expect(() => new Asset('USD')).toThrow();
  });

  it('roundtrips through modern', () => {
    const a = new Asset('USD', ISSUER);
    const modern = a._toModern();
    const back = Asset._fromModern(modern);
    expect(back.getCode()).toBe('USD');
    expect(back.getIssuer()).toBe(ISSUER);
  });

  it('roundtrips native through modern', () => {
    const a = Asset.native();
    const modern = a._toModern();
    const back = Asset._fromModern(modern);
    expect(back.isNative()).toBe(true);
  });

  it('equals', () => {
    const a = new Asset('USD', ISSUER);
    const b = new Asset('USD', ISSUER);
    expect(a.equals(b)).toBe(true);
  });

  it('compare orders native first', () => {
    const native = Asset.native();
    const usd = new Asset('USD', ISSUER);
    expect(native.compare(usd)).toBeLessThan(0);
    expect(usd.compare(native)).toBeGreaterThan(0);
  });

  it('toString', () => {
    expect(Asset.native().toString()).toBe('native');
    expect(new Asset('USD', ISSUER).toString()).toBe(`USD:${ISSUER}`);
  });
});
