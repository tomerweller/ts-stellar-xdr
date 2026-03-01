/**
 * Muxed account utility functions matching js-stellar-base.
 */

import {
  decodeStrkey,
  encodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
} from '@stellar/strkey';
import { parseMuxedAccount } from '@stellar/tx-builder';
import { is, type MuxedAccount } from '@stellar/xdr';
import { MuxedAccount as CompatMuxedAccount } from './generated/stellar_compat.js';

/**
 * Decode a G- or M-address string into a compat MuxedAccount XDR object.
 */
export function decodeAddressToMuxedAccount(address: string): any {
  const modern = parseMuxedAccount(address);
  return (CompatMuxedAccount as any)._fromModern(modern);
}

/**
 * Encode a modern or compat MuxedAccount XDR object to a G- or M-address string.
 */
export function encodeMuxedAccountToAddress(muxedAccount: any): string {
  // Handle compat objects (with _toModern method)
  if (muxedAccount && typeof muxedAccount._toModern === 'function') {
    return encodeMuxedAccountToAddress(muxedAccount._toModern());
  }
  // Handle compat objects with switch()/ed25519()/med25519() methods
  if (muxedAccount && typeof muxedAccount.switch === 'function') {
    const sw = muxedAccount.switch();
    const swName = typeof sw === 'string' ? sw : (sw?.name ?? '');
    if (swName === 'keyTypeEd25519') {
      return encodeStrkey(STRKEY_ED25519_PUBLIC, muxedAccount.ed25519());
    }
    if (swName === 'keyTypeMuxedEd25519') {
      const inner = muxedAccount.med25519();
      const ed25519Key = typeof inner.ed25519 === 'function' ? inner.ed25519() : inner.ed25519;
      const id = typeof inner.id === 'function' ? inner.id() : inner.id;
      const idBigInt = typeof id === 'bigint' ? id : (typeof id?.toBigInt === 'function' ? id.toBigInt() : BigInt(id.toString()));
      const payload = new Uint8Array(40);
      payload.set(ed25519Key, 0);
      const view = new DataView(payload.buffer);
      view.setBigUint64(32, idBigInt, false);
      return encodeStrkey(STRKEY_MUXED_ED25519, payload);
    }
  }
  // Modern format
  if (is(muxedAccount, 'Ed25519')) {
    return encodeStrkey(STRKEY_ED25519_PUBLIC, (muxedAccount as any).Ed25519);
  }
  if (is(muxedAccount, 'MuxedEd25519')) {
    const muxed = (muxedAccount as any).MuxedEd25519;
    const payload = new Uint8Array(40);
    payload.set(muxed.ed25519, 0);
    const view = new DataView(payload.buffer);
    view.setBigUint64(32, muxed.id, false);
    return encodeStrkey(STRKEY_MUXED_ED25519, payload);
  }
  throw new Error('Unknown MuxedAccount type');
}

/**
 * Create a MuxedAccount XDR object from a G-address and a muxed ID string.
 */
export function encodeMuxedAccount(gAddress: string, id: string): MuxedAccount {
  const { payload } = decodeStrkey(gAddress);
  return {
    MuxedEd25519: {
      id: BigInt(id),
      ed25519: payload,
    },
  };
}

/**
 * Validate a Date object.
 */
export function isValidDate(d: any): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}
