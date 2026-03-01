/**
 * Address class — unified G/M/C address handling, compatible with js-stellar-base.
 */

import {
  decodeStrkey,
  encodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
  STRKEY_CONTRACT,
  STRKEY_CLAIMABLE_BALANCE,
  STRKEY_LIQUIDITY_POOL,
} from '@stellar/xdr';

import {
  ScAddress as CompatScAddress,
  ScVal as CompatScVal,
  PublicKey as CompatPublicKey,
  MuxedAccount as CompatMuxedAccount,
} from './generated/stellar_compat.js';

export class Address {
  private readonly _address: string;
  private readonly _version: number;
  private readonly _payload: Uint8Array;

  private static readonly SUPPORTED_VERSIONS = new Set([
    STRKEY_ED25519_PUBLIC,
    STRKEY_CONTRACT,
    STRKEY_MUXED_ED25519,
    STRKEY_CLAIMABLE_BALANCE,
    STRKEY_LIQUIDITY_POOL,
  ]);

  constructor(address: string) {
    let version: number;
    let payload: Uint8Array;
    try {
      ({ version, payload } = decodeStrkey(address));
    } catch {
      throw new Error(`Unsupported address type`);
    }
    if (!Address.SUPPORTED_VERSIONS.has(version)) {
      throw new Error(`Unsupported address type`);
    }
    this._address = address;
    this._version = version;
    this._payload = payload;
  }

  static fromString(address: string): Address {
    return new Address(address);
  }

  static account(buffer: Uint8Array): Address {
    return new Address(encodeStrkey(STRKEY_ED25519_PUBLIC, buffer));
  }

  static contract(buffer: Uint8Array): Address {
    return new Address(encodeStrkey(STRKEY_CONTRACT, buffer));
  }

  static muxedAccount(buffer: Uint8Array): Address {
    return new Address(encodeStrkey(STRKEY_MUXED_ED25519, buffer));
  }

  static claimableBalance(buffer: Uint8Array): Address {
    return new Address(encodeStrkey(STRKEY_CLAIMABLE_BALANCE, buffer));
  }

  static liquidityPool(buffer: Uint8Array): Address {
    return new Address(encodeStrkey(STRKEY_LIQUIDITY_POOL, buffer));
  }

  static fromScVal(scVal: any): Address {
    // Handle compat ScVal with accessor method
    if (typeof scVal?.address === 'function') {
      return Address.fromScAddress(scVal.address());
    }
    // Handle modern ScVal
    if (scVal?.Address) {
      return Address.fromScAddress(scVal.Address);
    }
    throw new Error('Cannot extract Address from ScVal');
  }

  static fromScAddress(scAddress: any): Address {
    // Handle compat ScAddress with switch/accessor methods
    if (typeof scAddress?.switch === 'function') {
      const sw = scAddress.switch();
      const name = typeof sw === 'string' ? sw : sw?.name;
      if (name === 'scAddressTypeAccount') {
        const accountId = scAddress.accountId();
        const ed25519 = typeof accountId?.ed25519 === 'function' ? accountId.ed25519() : accountId?.PublicKeyTypeEd25519;
        return new Address(encodeStrkey(STRKEY_ED25519_PUBLIC, ed25519));
      }
      if (name === 'scAddressTypeContract') {
        return new Address(encodeStrkey(STRKEY_CONTRACT, scAddress.contractId()));
      }
      if (name === 'scAddressTypeMuxedAccount') {
        const muxed = scAddress.muxedAccount();
        const ed25519 = typeof muxed?.ed25519 === 'function' ? muxed.ed25519() : muxed?._attributes?.ed25519;
        const id = typeof muxed?.id === 'function' ? muxed.id() : muxed?._attributes?.id;
        const payload = new Uint8Array(40);
        payload.set(ed25519, 0);
        const view = new DataView(payload.buffer);
        const idBigInt = typeof id === 'bigint' ? id : BigInt(id.toBigInt ? id.toBigInt() : id.toString());
        view.setBigUint64(32, idBigInt, false);
        return new Address(encodeStrkey(STRKEY_MUXED_ED25519, payload));
      }
      if (name === 'scAddressTypeClaimableBalance') {
        const cbId = scAddress.claimableBalanceId();
        // Get the raw hash from the claimable balance ID union
        let hash: Uint8Array;
        if (typeof cbId?.switch === 'function') {
          hash = cbId.value();
        } else if (cbId?.ClaimableBalanceIdTypeV0) {
          hash = cbId.ClaimableBalanceIdTypeV0;
        } else {
          hash = cbId;
        }
        // ClaimableBalance strkey: 1-byte type (0) + 32-byte hash = 33 bytes
        const buf = new Uint8Array(33);
        buf[0] = 0; // V0
        buf.set(hash, 1);
        return new Address(encodeStrkey(STRKEY_CLAIMABLE_BALANCE, buf));
      }
      if (name === 'scAddressTypeLiquidityPool') {
        return new Address(encodeStrkey(STRKEY_LIQUIDITY_POOL, scAddress.liquidityPoolId()));
      }
    }

    // Handle modern ScAddress (plain objects)
    if ('Account' in scAddress) {
      const pk = scAddress.Account;
      if ('PublicKeyTypeEd25519' in pk) {
        return new Address(encodeStrkey(STRKEY_ED25519_PUBLIC, pk.PublicKeyTypeEd25519));
      }
    }
    if ('Contract' in scAddress) {
      return new Address(encodeStrkey(STRKEY_CONTRACT, scAddress.Contract));
    }
    if ('MuxedAccount' in scAddress) {
      const muxed = scAddress.MuxedAccount;
      const payload = new Uint8Array(40);
      payload.set(muxed.ed25519, 0);
      const view = new DataView(payload.buffer);
      view.setBigUint64(32, muxed.id, false);
      return new Address(encodeStrkey(STRKEY_MUXED_ED25519, payload));
    }
    if ('ClaimableBalance' in scAddress) {
      const cbId = scAddress.ClaimableBalance;
      let hash: Uint8Array;
      if (cbId?.ClaimableBalanceIdTypeV0) {
        hash = cbId.ClaimableBalanceIdTypeV0;
      } else {
        hash = cbId;
      }
      const buf = new Uint8Array(33);
      buf[0] = 0;
      buf.set(hash, 1);
      return new Address(encodeStrkey(STRKEY_CLAIMABLE_BALANCE, buf));
    }
    if ('LiquidityPool' in scAddress) {
      return new Address(encodeStrkey(STRKEY_LIQUIDITY_POOL, scAddress.LiquidityPool));
    }

    throw new Error('Unsupported SCAddress type');
  }

  toString(): string {
    return this._address;
  }

  toScAddress(): any {
    if (this._version === STRKEY_ED25519_PUBLIC) {
      return (CompatScAddress as any)._fromModern({ Account: { PublicKeyTypeEd25519: this._payload } });
    }
    if (this._version === STRKEY_CONTRACT) {
      return (CompatScAddress as any)._fromModern({ Contract: this._payload });
    }
    if (this._version === STRKEY_MUXED_ED25519) {
      const ed25519 = this._payload.slice(0, 32);
      const view = new DataView(this._payload.buffer, this._payload.byteOffset + 32, 8);
      const id = view.getBigUint64(0, false);
      return (CompatScAddress as any)._fromModern({ MuxedAccount: { ed25519, id } });
    }
    if (this._version === STRKEY_CLAIMABLE_BALANCE) {
      // payload is 33 bytes: 1-byte type + 32-byte hash
      const hash = this._payload.slice(1);
      return (CompatScAddress as any)._fromModern({ ClaimableBalance: { ClaimableBalanceIdTypeV0: hash } });
    }
    if (this._version === STRKEY_LIQUIDITY_POOL) {
      return (CompatScAddress as any)._fromModern({ LiquidityPool: this._payload });
    }
    throw new Error(`Cannot convert address type ${this._version} to SCAddress`);
  }

  toScVal(): any {
    return (CompatScVal as any)._fromModern({ Address: this.toScAddress()._toModern() });
  }

  toBuffer(): Uint8Array {
    return this._payload;
  }
}
