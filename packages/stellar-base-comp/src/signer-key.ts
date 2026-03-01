/**
 * SignerKey static namespace — decode/encode StrKey addresses to xdr.SignerKey.
 * Compatible with js-stellar-base.
 */

import {
  decodeStrkey,
  encodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_ED25519_PRIVATE,
  STRKEY_PRE_AUTH_TX,
  STRKEY_HASH_X,
  STRKEY_SIGNED_PAYLOAD,
  STRKEY_MUXED_ED25519,
  STRKEY_CONTRACT,
} from '@stellar/strkey';

import {
  SignerKey as CompatSignerKeyXdr,
  SignerKeyEd25519SignedPayload as CompatSignerKeyEd25519SignedPayload,
} from './generated/stellar_compat.js';

const VALID_SIGNER_VERSIONS = new Set([
  STRKEY_ED25519_PUBLIC,
  STRKEY_PRE_AUTH_TX,
  STRKEY_HASH_X,
  STRKEY_SIGNED_PAYLOAD,
]);

/** All known strkey version bytes */
const ALL_KNOWN_VERSIONS = new Set([
  STRKEY_ED25519_PUBLIC,
  STRKEY_ED25519_PRIVATE,
  STRKEY_PRE_AUTH_TX,
  STRKEY_HASH_X,
  STRKEY_SIGNED_PAYLOAD,
  STRKEY_MUXED_ED25519,
  STRKEY_CONTRACT,
]);

export const SignerKey = {
  /**
   * Decode a StrKey-encoded signer address to a compat xdr.SignerKey object.
   * Supports G (ed25519), T (pre-auth tx), X (sha256 hash), P (signed payload).
   */
  decodeAddress(address: string): any {
    let version: number;
    let payload: Uint8Array;
    try {
      ({ version, payload } = decodeStrkey(address));
    } catch (e: any) {
      // If decodeStrkey fails (checksum, invalid base32, etc.), throw "Invalid signer key type"
      throw new Error(`Invalid signer key type`);
    }

    if (!ALL_KNOWN_VERSIONS.has(version)) {
      throw new Error(`Invalid version byte. Got ${version}, expected one of ${[...ALL_KNOWN_VERSIONS].join(', ')}`);
    }
    if (!VALID_SIGNER_VERSIONS.has(version)) {
      throw new Error(`Invalid signer key type`);
    }

    switch (version) {
      case STRKEY_ED25519_PUBLIC:
        return (CompatSignerKeyXdr as any).signerKeyTypeEd25519(new Uint8Array(payload));
      case STRKEY_PRE_AUTH_TX:
        return (CompatSignerKeyXdr as any).signerKeyTypePreAuthTx(new Uint8Array(payload));
      case STRKEY_HASH_X:
        return (CompatSignerKeyXdr as any).signerKeyTypeHashX(new Uint8Array(payload));
      case STRKEY_SIGNED_PAYLOAD: {
        // Signed payload: first 32 bytes = ed25519 key, rest = payload with 4-byte length prefix
        const ed25519 = payload.slice(0, 32);
        const view = new DataView(payload.buffer, payload.byteOffset + 32, 4);
        const payloadLen = view.getUint32(0, false);
        const sigPayload = payload.slice(36, 36 + payloadLen);

        const spStruct = new (CompatSignerKeyEd25519SignedPayload as any)({
          ed25519: new Uint8Array(ed25519),
          payload: new Uint8Array(sigPayload),
        });
        return (CompatSignerKeyXdr as any).signerKeyTypeEd25519SignedPayload(spStruct);
      }
      default:
        throw new Error(`Invalid signer key type`);
    }
  },

  /**
   * Encode an xdr.SignerKey (compat or modern) to a StrKey string.
   */
  encodeSignerKey(signerKey: any): string {
    // Handle compat xdr.SignerKey with switch/accessor methods
    if (typeof signerKey.switch === 'function') {
      const sw = signerKey.switch();
      const name = typeof sw === 'string' ? sw : sw?.name;
      if (name === 'signerKeyTypeEd25519') {
        return encodeStrkey(STRKEY_ED25519_PUBLIC, signerKey.ed25519());
      }
      if (name === 'signerKeyTypePreAuthTx') {
        return encodeStrkey(STRKEY_PRE_AUTH_TX, signerKey.preAuthTx());
      }
      if (name === 'signerKeyTypeHashX') {
        return encodeStrkey(STRKEY_HASH_X, signerKey.hashX());
      }
      if (name === 'signerKeyTypeEd25519SignedPayload') {
        const sp = signerKey.ed25519SignedPayload();
        const ed25519 = typeof sp.ed25519 === 'function' ? sp.ed25519() : sp._attributes?.ed25519 ?? sp.ed25519;
        const sigPayload = typeof sp.payload === 'function' ? sp.payload() : sp._attributes?.payload ?? sp.payload;
        const padLen = (4 - (sigPayload.length % 4)) % 4;
        const buf = new Uint8Array(32 + 4 + sigPayload.length + padLen);
        buf.set(ed25519, 0);
        const view = new DataView(buf.buffer, 32, 4);
        view.setUint32(0, sigPayload.length, false);
        buf.set(sigPayload, 36);
        return encodeStrkey(STRKEY_SIGNED_PAYLOAD, buf);
      }
    }

    // Handle modern SignerKey (plain objects)
    if (signerKey.Ed25519) {
      return encodeStrkey(STRKEY_ED25519_PUBLIC, signerKey.Ed25519);
    }
    if (signerKey.PreAuthTx) {
      return encodeStrkey(STRKEY_PRE_AUTH_TX, signerKey.PreAuthTx);
    }
    if (signerKey.HashX) {
      return encodeStrkey(STRKEY_HASH_X, signerKey.HashX);
    }
    if (signerKey.Ed25519SignedPayload) {
      const { ed25519, payload: sigPayload } = signerKey.Ed25519SignedPayload;
      const padLen = (4 - (sigPayload.length % 4)) % 4;
      const buf = new Uint8Array(32 + 4 + sigPayload.length + padLen);
      buf.set(ed25519, 0);
      const view = new DataView(buf.buffer, 32, 4);
      view.setUint32(0, sigPayload.length, false);
      buf.set(sigPayload, 36);
      return encodeStrkey(STRKEY_SIGNED_PAYLOAD, buf);
    }
    throw new Error('Unknown SignerKey type');
  },
};
