/**
 * Sync Keypair compatible with js-stellar-base.
 *
 * Configures @noble/ed25519 for sync operations via @noble/hashes,
 * then provides a fully synchronous Keypair class.
 */

import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import {
  getPublicKey,
  sign as ed25519Sign,
  verify as ed25519Verify,
  utils,
  etc,
} from '@noble/ed25519';
import {
  encodeStrkey,
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_ED25519_PRIVATE,
} from '@stellar/strkey';
import { PublicKey, MuxedAccount, MuxedAccountMed25519, DecoratedSignature } from './generated/stellar_compat.js';
import { UnsignedHyper } from './xdr-compat/hyper.js';
import { augmentBuffer, hash as hashFn } from './signing.js';

// Configure sync SHA-512 for @noble/ed25519
etc.sha512Sync = (...msgs: Uint8Array[]) => sha512(etc.concatBytes(...msgs));

const encoder = new TextEncoder();

/** Coerce Buffer/string/array to pure Uint8Array */
function coerceBytes(input: any): Uint8Array {
  if (input == null) throw new Error('cannot sign with null data');
  if (typeof input === 'string') return encoder.encode(input);
  if (input instanceof Uint8Array) {
    return input.constructor === Uint8Array ? input : new Uint8Array(input);
  }
  if (Array.isArray(input)) return new Uint8Array(input);
  return new Uint8Array(input);
}

/** SEP-53 signing domain separator: "Stellar Signed Message:\n" */
const SEP53_PREFIX = encoder.encode('Stellar Signed Message:\n');

function sep53Payload(message: string | Uint8Array): Uint8Array {
  const msgBytes = typeof message === 'string' ? encoder.encode(message) : coerceBytes(message);
  const result = new Uint8Array(SEP53_PREFIX.length + msgBytes.length);
  result.set(SEP53_PREFIX);
  result.set(msgBytes, SEP53_PREFIX.length);
  return result;
}

export class Keypair {
  private _publicKey: Uint8Array;
  private _secretKey: Uint8Array | null;

  constructor(keys: any, secretKeyOrNull?: Uint8Array | null) {
    // Support legacy internal constructor: new Keypair(pubBytes, secretBytes)
    if (keys instanceof Uint8Array || (keys != null && typeof keys !== 'object')) {
      const pub = coerceBytes(keys);
      const sec = secretKeyOrNull != null ? coerceBytes(secretKeyOrNull) : null;
      this._publicKey = pub;
      this._secretKey = sec;
      return;
    }

    // Public constructor: new Keypair({ type, secretKey?, publicKey? })
    if (keys.type !== 'ed25519') throw new Error('Invalid keys type');

    const secretKey = keys.secretKey != null ? coerceBytes(keys.secretKey) : null;
    const publicKey = keys.publicKey != null ? coerceBytes(keys.publicKey) : null;

    if (secretKey && secretKey.length !== 32) {
      throw new Error('secretKey length is invalid');
    }
    if (publicKey && publicKey.length !== 32) {
      throw new Error('publicKey length is invalid');
    }

    if (secretKey) {
      const derivedPub = getPublicKey(secretKey);
      if (publicKey) {
        // Validate match
        let match = true;
        for (let i = 0; i < 32; i++) {
          if (derivedPub[i] !== publicKey[i]) { match = false; break; }
        }
        if (!match) {
          throw new Error('secretKey does not match publicKey');
        }
      }
      this._publicKey = derivedPub;
      this._secretKey = secretKey;
    } else if (publicKey) {
      this._publicKey = publicKey;
      this._secretKey = null;
    } else {
      throw new Error('Must provide secretKey or publicKey');
    }
  }

  static random(): Keypair {
    const secret = utils.randomPrivateKey();
    const pub = getPublicKey(secret);
    return new Keypair(pub, secret);
  }

  static fromSecret(sAddress: string): Keypair {
    const { version, payload } = decodeStrkey(sAddress);
    if (version !== STRKEY_ED25519_PRIVATE) {
      throw new Error('Expected ed25519 secret key (S-address)');
    }
    const pub = getPublicKey(payload);
    return new Keypair(pub, payload);
  }

  static fromRawEd25519Seed(bytes: any): Keypair {
    if (bytes == null) throw new Error('seed must not be null');
    const data = coerceBytes(bytes);
    if (data.length !== 32) {
      throw new Error('Secret key must be 32 bytes');
    }
    const pub = getPublicKey(data);
    return new Keypair(pub, data);
  }

  /**
   * Returns the master keypair derived from the network passphrase.
   */
  static master(networkPassphrase: string): Keypair {
    const seed = nobleSha256(encoder.encode(networkPassphrase));
    return Keypair.fromRawEd25519Seed(seed);
  }

  static fromPublicKey(gAddress: string): Keypair {
    if (gAddress == null || typeof gAddress !== 'string') {
      throw new Error('Invalid public key');
    }
    const { version, payload } = decodeStrkey(gAddress);
    if (version !== STRKEY_ED25519_PUBLIC) {
      throw new Error('Expected ed25519 public key (G-address)');
    }
    return new Keypair(payload, null);
  }

  static fromRawPublicKey(bytes: Uint8Array): Keypair {
    if (bytes == null) throw new Error('public key must not be null');
    const data = coerceBytes(bytes);
    if (data.length !== 32) {
      throw new Error('Public key must be 32 bytes');
    }
    return new Keypair(data, null);
  }

  get type(): string {
    return 'ed25519';
  }

  /** Returns the G-address string (method, not getter — matching js-stellar-base) */
  publicKey(): string {
    return encodeStrkey(STRKEY_ED25519_PUBLIC, this._publicKey);
  }

  /** Returns the S-address string */
  secret(): string {
    if (this._secretKey === null) {
      throw new Error('No secret key available (public-only keypair)');
    }
    return encodeStrkey(STRKEY_ED25519_PRIVATE, this._secretKey);
  }

  rawPublicKey(): any {
    return augmentBuffer(new Uint8Array(this._publicKey));
  }

  rawSecretKey(): Uint8Array {
    if (this._secretKey === null) {
      throw new Error('No secret key available (public-only keypair)');
    }
    return this._secretKey;
  }

  canSign(): boolean {
    return this._secretKey !== null;
  }

  signatureHint(): any {
    return augmentBuffer(this._publicKey.slice(-4));
  }

  sign(data: any): any {
    if (this._secretKey === null) {
      throw new Error('Cannot sign: no secret key available');
    }
    const bytes = coerceBytes(data);
    return augmentBuffer(ed25519Sign(bytes, this._secretKey));
  }

  signDecorated(data: any): any {
    const bytes = coerceBytes(data);
    const signature = this.sign(bytes);
    const hint = this.signatureHint();
    return new (DecoratedSignature as any)({ hint, signature });
  }

  /**
   * Sign data with a XORed hint for payload signers.
   * The hint is the last 4 bytes of the account XDR, XORed with the last 4 bytes of the payload.
   */
  signPayloadDecorated(data: any): any {
    const bytes = coerceBytes(data);
    const signature = this.sign(bytes);
    const hint = new Uint8Array(this._publicKey.slice(-4));
    // XOR hint with last 4 bytes of the payload (data)
    const payloadEnd = bytes.slice(-4);
    for (let i = 0; i < 4; i++) {
      hint[i]! ^= payloadEnd[i] ?? 0;
    }
    return new (DecoratedSignature as any)({ hint: augmentBuffer(hint), signature });
  }

  verify(data: any, signature: any): boolean {
    const dataBytes = coerceBytes(data);
    const sigBytes = coerceBytes(signature);
    return ed25519Verify(sigBytes, dataBytes, this._publicKey);
  }

  /** SEP-53 message signing */
  signMessage(message: string | Uint8Array): any {
    if (this._secretKey === null) {
      throw new Error('cannot sign when no secret key is available');
    }
    const payload = sep53Payload(message);
    const hashed = hashFn(payload);
    return augmentBuffer(ed25519Sign(hashed, this._secretKey));
  }

  /** SEP-53 message verification */
  verifyMessage(message: string | Uint8Array, signature: any): boolean {
    const payload = sep53Payload(message);
    const hashed = hashFn(payload);
    const sigBytes = coerceBytes(signature);
    return ed25519Verify(sigBytes, hashed, this._publicKey);
  }

  xdrPublicKey(): any {
    return (PublicKey as any).publicKeyTypeEd25519(augmentBuffer(new Uint8Array(this._publicKey)));
  }

  xdrAccountId(): any {
    return this.xdrPublicKey();
  }

  xdrMuxedAccount(id?: string): any {
    if (id !== undefined) {
      // Return muxed account with ID
      const med25519 = new (MuxedAccountMed25519 as any)({
        id: UnsignedHyper.fromString(id),
        ed25519: augmentBuffer(new Uint8Array(this._publicKey)),
      });
      return (MuxedAccount as any).keyTypeMuxedEd25519(med25519);
    }
    return (MuxedAccount as any).keyTypeEd25519(augmentBuffer(new Uint8Array(this._publicKey)));
  }
}
