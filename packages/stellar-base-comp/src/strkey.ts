/**
 * StrKey utility object — wraps @stellar/strkey with the js-stellar-base API.
 */

import {
  encodeStrkey,
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_ED25519_PRIVATE,
  STRKEY_PRE_AUTH_TX,
  STRKEY_HASH_X,
  STRKEY_MUXED_ED25519,
  STRKEY_SIGNED_PAYLOAD,
  STRKEY_CONTRACT,
  STRKEY_CLAIMABLE_BALANCE,
  STRKEY_LIQUIDITY_POOL,
} from '@stellar/strkey';
import { augmentBuffer } from './signing.js';

/** Base32 alphabet used for decoding the first character to a version byte */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Extract the version byte from a strkey address by decoding just the
 * first character. This avoids full decoding/validation so it works
 * even on invalid strkeys (as long as the first char is valid base32).
 *
 * The version byte occupies the first 8 bits of the raw data.
 * The first base32 character encodes the top 5 bits (bits 7..3).
 * The next character contributes bits 2..0 in its top 3 bits.
 */
function versionByteFromPrefix(address: string): number {
  if (!address || address.length < 2) {
    throw new Error('invalid encoded string');
  }
  const c0 = BASE32_ALPHABET.indexOf(address[0]!);
  const c1 = BASE32_ALPHABET.indexOf(address[1]!);
  if (c0 < 0 || c1 < 0) {
    throw new Error('invalid encoded string');
  }
  // First char provides bits 7..3, second char's top 3 bits provide bits 2..0
  return ((c0 << 3) | (c1 >>> 2)) & 0xff;
}

/**
 * Known valid version bytes. Used by decodeCheck to reject unknown types.
 */
const KNOWN_VERSIONS = new Set([
  STRKEY_ED25519_PUBLIC,
  STRKEY_ED25519_PRIVATE,
  STRKEY_PRE_AUTH_TX,
  STRKEY_HASH_X,
  STRKEY_MUXED_ED25519,
  STRKEY_SIGNED_PAYLOAD,
  STRKEY_CONTRACT,
  STRKEY_CLAIMABLE_BALANCE,
  STRKEY_LIQUIDITY_POOL,
]);

/**
 * Expected payload sizes for fixed-length strkey types.
 */
const EXPECTED_PAYLOAD_SIZES: Record<number, number> = {
  [STRKEY_ED25519_PUBLIC]: 32,
  [STRKEY_ED25519_PRIVATE]: 32,
  [STRKEY_PRE_AUTH_TX]: 32,
  [STRKEY_HASH_X]: 32,
  [STRKEY_CONTRACT]: 32,
  [STRKEY_LIQUIDITY_POOL]: 32,
  [STRKEY_MUXED_ED25519]: 40,
  [STRKEY_CLAIMABLE_BALANCE]: 33,
  // STRKEY_SIGNED_PAYLOAD is variable-length, validated separately
};

function encode(version: number, payload: any): string {
  if (payload == null) throw new Error('cannot encode null data');
  const data = payload instanceof Uint8Array
    ? (payload.constructor === Uint8Array ? payload : new Uint8Array(payload))
    : typeof payload === 'string'
      ? new TextEncoder().encode(payload)
      : new Uint8Array(payload);
  return encodeStrkey(version, data);
}

function decode(str: string, expectedVersion: number): any {
  // Reject padding characters
  if (str.includes('=')) {
    throw new Error('invalid encoded string');
  }

  let version: number;
  let payload: Uint8Array;
  try {
    const result = decodeStrkey(str);
    version = result.version;
    payload = result.payload;
  } catch (e: any) {
    const msg: string = e?.message ?? '';
    if (msg.includes('checksum mismatch')) {
      throw new Error('invalid checksum');
    }
    // All other decoding errors (invalid base32, wrong length, trailing bits, etc.)
    throw new Error('invalid encoded string');
  }

  if (version !== expectedVersion) {
    throw new Error(`invalid version byte. expected ${expectedVersion}, got ${version}`);
  }

  // Validate that the version byte is a known type (low 3 bits must be 0 for standard types)
  if (!KNOWN_VERSIONS.has(version)) {
    throw new Error('invalid encoded string');
  }

  // Validate payload length for fixed-length types
  const expectedSize = EXPECTED_PAYLOAD_SIZES[version];
  if (expectedSize !== undefined && payload.length !== expectedSize) {
    throw new Error('invalid encoded string');
  }

  // Validate signed payload structure
  if (version === STRKEY_SIGNED_PAYLOAD) {
    validateSignedPayload(payload);
  }

  // Validate claimable balance subtype
  if (version === STRKEY_CLAIMABLE_BALANCE) {
    if (payload.length < 1 || payload[0] !== 0x00) {
      throw new Error('invalid encoded string');
    }
  }

  // Round-trip validation: re-encode and compare
  const reencoded = encodeStrkey(version, payload);
  if (reencoded !== str) {
    throw new Error('invalid encoded string');
  }

  return augmentBuffer(new Uint8Array(payload));
}

/**
 * Validate signed payload structure:
 * - 32 bytes ed25519 key
 * - 4 bytes big-endian payload length
 * - payload padded to 4-byte boundary
 * - payload length must be 1..64
 */
function validateSignedPayload(payload: Uint8Array): void {
  if (payload.length < 36) {
    throw new Error('invalid encoded string');
  }
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const innerLen = view.getUint32(32);
  if (innerLen < 1 || innerLen > 64) {
    throw new Error('invalid encoded string');
  }
  const padding = (4 - (innerLen % 4)) % 4;
  const expectedTotal = 36 + innerLen + padding;
  if (payload.length !== expectedTotal) {
    throw new Error('invalid encoded string');
  }
}

function isValid(str: any, expectedVersion: number): boolean {
  if (typeof str !== 'string' || !str) return false;
  try {
    decode(str, expectedVersion);
    return true;
  } catch {
    return false;
  }
}

const VERSION_MAP: Record<string, number> = {
  ed25519PublicKey: STRKEY_ED25519_PUBLIC,
  ed25519SecretSeed: STRKEY_ED25519_PRIVATE,
  preAuthTx: STRKEY_PRE_AUTH_TX,
  sha256Hash: STRKEY_HASH_X,
  med25519PublicKey: STRKEY_MUXED_ED25519,
  signedPayload: STRKEY_SIGNED_PAYLOAD,
  contract: STRKEY_CONTRACT,
  claimableBalance: STRKEY_CLAIMABLE_BALANCE,
  liquidityPool: STRKEY_LIQUIDITY_POOL,
};

export const StrKey = {
  encodeEd25519PublicKey(data: any): string {
    return encode(STRKEY_ED25519_PUBLIC, data);
  },
  decodeEd25519PublicKey(str: string): any {
    return decode(str, STRKEY_ED25519_PUBLIC);
  },
  isValidEd25519PublicKey(str: any): boolean {
    return isValid(str, STRKEY_ED25519_PUBLIC);
  },

  encodeEd25519SecretSeed(data: any): string {
    return encode(STRKEY_ED25519_PRIVATE, data);
  },
  decodeEd25519SecretSeed(str: string): any {
    return decode(str, STRKEY_ED25519_PRIVATE);
  },
  isValidEd25519SecretSeed(str: any): boolean {
    return isValid(str, STRKEY_ED25519_PRIVATE);
  },

  encodePreAuthTx(data: any): string {
    return encode(STRKEY_PRE_AUTH_TX, data);
  },
  decodePreAuthTx(str: string): any {
    return decode(str, STRKEY_PRE_AUTH_TX);
  },
  isValidPreAuthTx(str: any): boolean {
    return isValid(str, STRKEY_PRE_AUTH_TX);
  },

  encodeSha256Hash(data: any): string {
    return encode(STRKEY_HASH_X, data);
  },
  decodeSha256Hash(str: string): any {
    return decode(str, STRKEY_HASH_X);
  },
  isValidSha256Hash(str: any): boolean {
    return isValid(str, STRKEY_HASH_X);
  },

  encodeMed25519PublicKey(data: any): string {
    return encode(STRKEY_MUXED_ED25519, data);
  },
  decodeMed25519PublicKey(str: string): any {
    return decode(str, STRKEY_MUXED_ED25519);
  },
  isValidMed25519PublicKey(str: any): boolean {
    return isValid(str, STRKEY_MUXED_ED25519);
  },

  encodeSignedPayload(data: any): string {
    return encode(STRKEY_SIGNED_PAYLOAD, data);
  },
  decodeSignedPayload(str: string): any {
    return decode(str, STRKEY_SIGNED_PAYLOAD);
  },
  isValidSignedPayload(str: any): boolean {
    return isValid(str, STRKEY_SIGNED_PAYLOAD);
  },

  encodeContract(data: any): string {
    return encode(STRKEY_CONTRACT, data);
  },
  decodeContract(str: string): any {
    return decode(str, STRKEY_CONTRACT);
  },
  isValidContract(str: any): boolean {
    return isValid(str, STRKEY_CONTRACT);
  },

  encodeClaimableBalance(data: any): string {
    return encode(STRKEY_CLAIMABLE_BALANCE, data);
  },
  decodeClaimableBalance(str: string): any {
    return decode(str, STRKEY_CLAIMABLE_BALANCE);
  },
  isValidClaimableBalance(str: any): boolean {
    return isValid(str, STRKEY_CLAIMABLE_BALANCE);
  },

  encodeLiquidityPool(data: any): string {
    return encode(STRKEY_LIQUIDITY_POOL, data);
  },
  decodeLiquidityPool(str: string): any {
    return decode(str, STRKEY_LIQUIDITY_POOL);
  },
  isValidLiquidityPool(str: any): boolean {
    return isValid(str, STRKEY_LIQUIDITY_POOL);
  },

  encodeCheck(versionByteName: string | number, data: any): string {
    const version = typeof versionByteName === 'number'
      ? versionByteName
      : VERSION_MAP[versionByteName];
    if (version === undefined) throw new Error(`Unknown version byte name: ${versionByteName}`);
    return encode(version, data);
  },

  decodeCheck(versionByteName: string | number, address: string): any {
    const version = typeof versionByteName === 'number'
      ? versionByteName
      : VERSION_MAP[versionByteName];
    if (version === undefined) throw new Error(`Unknown version byte name: ${versionByteName}`);
    return decode(address, version);
  },

  /**
   * Extract the version byte from the prefix of a strkey address.
   * Does NOT fully validate the address — just reads the version byte
   * from the first two base32 characters.
   */
  getVersionByteForPrefix(address: string): number {
    return versionByteFromPrefix(address);
  },

  types: {
    ed25519PublicKey: STRKEY_ED25519_PUBLIC,
    ed25519SecretSeed: STRKEY_ED25519_PRIVATE,
    preAuthTx: STRKEY_PRE_AUTH_TX,
    sha256Hash: STRKEY_HASH_X,
    med25519PublicKey: STRKEY_MUXED_ED25519,
    signedPayload: STRKEY_SIGNED_PAYLOAD,
    contract: STRKEY_CONTRACT,
    claimableBalance: STRKEY_CLAIMABLE_BALANCE,
    liquidityPool: STRKEY_LIQUIDITY_POOL,
  },
};
