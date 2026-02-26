/**
 * Address class — unified G/M/C address handling, compatible with js-stellar-base.
 */

import {
  decodeStrkey,
  encodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
  STRKEY_CONTRACT,
  type SCVal,
  type SCAddress,
} from '@stellar/xdr';

export class Address {
  private readonly _address: string;
  private readonly _version: number;
  private readonly _payload: Uint8Array;

  constructor(address: string) {
    const { version, payload } = decodeStrkey(address);
    this._address = address;
    this._version = version;
    this._payload = payload;
  }

  static fromString(address: string): Address {
    return new Address(address);
  }

  static fromScAddress(scAddress: SCAddress): Address {
    if ('Account' in scAddress) {
      const pk = scAddress.Account;
      if ('PublicKeyTypeEd25519' in pk) {
        return new Address(encodeStrkey(STRKEY_ED25519_PUBLIC, pk.PublicKeyTypeEd25519));
      }
    }
    if ('Contract' in scAddress) {
      return new Address(encodeStrkey(STRKEY_CONTRACT, scAddress.Contract));
    }
    throw new Error('Unsupported SCAddress type');
  }

  toString(): string {
    return this._address;
  }

  toScAddress(): SCAddress {
    if (this._version === STRKEY_ED25519_PUBLIC) {
      return { Account: { PublicKeyTypeEd25519: this._payload } };
    }
    if (this._version === STRKEY_CONTRACT) {
      return { Contract: this._payload };
    }
    throw new Error(`Cannot convert address type ${this._version} to SCAddress`);
  }

  toScVal(): SCVal {
    return { Address: this.toScAddress() };
  }

  toBuffer(): Uint8Array {
    return this._payload;
  }
}
