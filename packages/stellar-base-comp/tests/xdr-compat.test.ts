import { describe, it, expect } from 'vitest';
import {
  AssetType,
  MemoType,
  Asset,
  Memo,
  AlphaNum4,
  PublicKey,
  MuxedAccount,
  TimeBounds,
  DecoratedSignature,
} from '../src/generated/stellar_compat.js';
import { UnsignedHyper } from '../src/xdr-compat/hyper.js';

describe('createCompatEnum', () => {
  it('creates singletons via static factory', () => {
    const native = (AssetType as any).assetTypeNative();
    expect(native.name).toBe('assetTypeNative');
    expect(native.value).toBe(0);
  });

  it('converts to/from modern', () => {
    const native = (AssetType as any).assetTypeNative();
    expect(native._toModern()).toBe('Native');

    const back = (AssetType as any)._fromModern('Native');
    expect(back.name).toBe('assetTypeNative');
    expect(back).toBe(native); // same singleton
  });

  it('creates all members', () => {
    const ca4 = (AssetType as any).assetTypeCreditAlphanum4();
    expect(ca4.name).toBe('assetTypeCreditAlphanum4');
    expect(ca4.value).toBe(1);
  });
});

describe('createCompatStruct', () => {
  it('creates struct with constructor and getters', () => {
    const tb = new (TimeBounds as any)({
      minTime: UnsignedHyper.fromBigInt(0n),
      maxTime: UnsignedHyper.fromBigInt(100n),
    });
    expect(tb.minTime().toBigInt()).toBe(0n);
    expect(tb.maxTime().toBigInt()).toBe(100n);
  });

  it('supports setter via argument', () => {
    const tb = new (TimeBounds as any)({
      minTime: UnsignedHyper.fromBigInt(0n),
      maxTime: UnsignedHyper.fromBigInt(100n),
    });
    tb.maxTime(UnsignedHyper.fromBigInt(200n));
    expect(tb.maxTime().toBigInt()).toBe(200n);
  });

  it('converts to/from modern', () => {
    const tb = new (TimeBounds as any)({
      minTime: UnsignedHyper.fromBigInt(0n),
      maxTime: UnsignedHyper.fromBigInt(100n),
    });
    const modern = tb._toModern();
    expect(modern.minTime).toBe(0n);
    expect(modern.maxTime).toBe(100n);

    const back = (TimeBounds as any)._fromModern(modern);
    expect(back.minTime().toBigInt()).toBe(0n);
    expect(back.maxTime().toBigInt()).toBe(100n);
  });
});

describe('createCompatUnion', () => {
  it('creates void arm via static factory', () => {
    const native = (Asset as any).assetTypeNative();
    expect(native.switch().name).toBe('assetTypeNative');
    expect(native.arm()).toBeUndefined();
    expect(native.value()).toBeUndefined();
  });

  it('creates value arm via static factory', () => {
    const pubKey = new Uint8Array(32);
    const an4 = new (AlphaNum4 as any)({
      assetCode: new Uint8Array(4),
      issuer: (PublicKey as any).publicKeyTypeEd25519(pubKey),
    });
    const asset = (Asset as any).assetTypeCreditAlphanum4(an4);
    expect(asset.switch().name).toBe('assetTypeCreditAlphanum4');
    expect(asset.arm()).toBe('alphaNum4');
    expect(asset.alphaNum4()).toBe(an4);
  });

  it('converts void arm to/from modern', () => {
    const native = (Asset as any).assetTypeNative();
    const modern = native._toModern();
    expect(modern).toBe('Native');

    const back = (Asset as any)._fromModern(modern);
    expect(back.switch().name).toBe('assetTypeNative');
  });

  it('converts memo to/from modern', () => {
    const none = (Memo as any).memoNone();
    expect(none._toModern()).toBe('None');

    const text = (Memo as any).memoText('hello');
    const modern = text._toModern();
    expect(modern).toEqual({ Text: 'hello' });

    const back = (Memo as any)._fromModern(modern);
    expect(back.text()).toBe('hello');
  });
});

describe('XDR serialization', () => {
  it('roundtrips TimeBounds through XDR', () => {
    const tb = new (TimeBounds as any)({
      minTime: UnsignedHyper.fromBigInt(0n),
      maxTime: UnsignedHyper.fromBigInt(1234567890n),
    });
    const bytes = tb.toXDR();
    expect(bytes).toBeInstanceOf(Uint8Array);

    const back = (TimeBounds as any).fromXDR(bytes);
    expect(back.maxTime().toBigInt()).toBe(1234567890n);
  });

  it('roundtrips TimeBounds through base64', () => {
    const tb = new (TimeBounds as any)({
      minTime: UnsignedHyper.fromBigInt(10n),
      maxTime: UnsignedHyper.fromBigInt(20n),
    });
    const b64 = tb.toXDR('base64');
    expect(typeof b64).toBe('string');

    const back = (TimeBounds as any).fromXDR(b64, 'base64');
    expect(back.minTime().toBigInt()).toBe(10n);
  });

  it('validateXDR returns true for valid data', () => {
    const tb = new (TimeBounds as any)({
      minTime: UnsignedHyper.fromBigInt(0n),
      maxTime: UnsignedHyper.fromBigInt(100n),
    });
    const bytes = tb.toXDR();
    expect((TimeBounds as any).validateXDR(bytes)).toBe(true);
  });
});
