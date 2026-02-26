/**
 * Asset class compatible with js-stellar-base.
 */

import {
  nativeAsset,
  creditAsset,
  type Asset as ModernAsset,
} from '@stellar/tx-builder';
import {
  is,
  encodeStrkey,
  STRKEY_ED25519_PUBLIC,
} from '@stellar/xdr';
import {
  Asset as CompatAssetXdr,
  ChangeTrustAsset as CompatChangeTrustAsset,
} from './generated/stellar_compat.js';

export class Asset {
  private readonly _code: string;
  private readonly _issuer: string | null;

  constructor(code: string, issuer?: string | null) {
    if (code === 'XLM' && !issuer) {
      this._code = 'XLM';
      this._issuer = null;
    } else {
      if (!code || code.length > 12) {
        throw new Error(`Asset code must be 1-12 characters, got "${code}"`);
      }
      this._code = code;
      this._issuer = issuer ?? null;
      if (!this._issuer && code !== 'XLM') {
        throw new Error('Non-native asset requires an issuer');
      }
    }
  }

  static native(): Asset {
    return new Asset('XLM');
  }

  isNative(): boolean {
    return this._issuer === null;
  }

  getCode(): string {
    return this._code;
  }

  getIssuer(): string | undefined {
    return this._issuer ?? undefined;
  }

  getAssetType(): string {
    if (this.isNative()) return 'native';
    if (this._code.length <= 4) return 'credit_alphanum4';
    return 'credit_alphanum12';
  }

  _toModern(): ModernAsset {
    if (this.isNative()) {
      return nativeAsset();
    }
    return creditAsset(this._code, this._issuer!);
  }

  toXDRObject(): any {
    return (CompatAssetXdr as any)._fromModern(this._toModern());
  }

  toChangeTrustXDRObject(): any {
    return (CompatChangeTrustAsset as any)._fromModern(this._toModern());
  }

  static fromOperation(xdrAsset: any): Asset {
    const modern: ModernAsset = xdrAsset._toModern();
    return Asset._fromModern(modern);
  }

  static _fromModern(modern: ModernAsset): Asset {
    if (modern === 'Native' || typeof modern === 'string') {
      return Asset.native();
    }
    const decoder = new TextDecoder();
    if (is(modern, 'CreditAlphanum4')) {
      const code = decoder.decode(modern.CreditAlphanum4.assetCode).replace(/\0+$/, '');
      const issuer = extractIssuer(modern.CreditAlphanum4.issuer);
      return new Asset(code, issuer);
    }
    if (is(modern, 'CreditAlphanum12')) {
      const code = decoder.decode(modern.CreditAlphanum12.assetCode).replace(/\0+$/, '');
      const issuer = extractIssuer(modern.CreditAlphanum12.issuer);
      return new Asset(code, issuer);
    }
    throw new Error('Unknown asset type');
  }

  toString(): string {
    if (this.isNative()) return 'native';
    return `${this._code}:${this._issuer}`;
  }

  equals(other: Asset): boolean {
    return this._code === other._code && this._issuer === other._issuer;
  }

  compare(other: Asset): number {
    if (this.isNative() && other.isNative()) return 0;
    if (this.isNative()) return -1;
    if (other.isNative()) return 1;
    const codeCmp = this._code.localeCompare(other._code);
    if (codeCmp !== 0) return codeCmp;
    return (this._issuer ?? '').localeCompare(other._issuer ?? '');
  }
}

function extractIssuer(accountId: any): string {
  if (is(accountId, 'PublicKeyTypeEd25519')) {
    return encodeStrkey(STRKEY_ED25519_PUBLIC, accountId.PublicKeyTypeEd25519);
  }
  throw new Error('Unknown account ID type');
}
