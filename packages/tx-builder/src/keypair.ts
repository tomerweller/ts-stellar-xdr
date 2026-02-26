import {
  getPublicKeyAsync,
  signAsync,
  verifyAsync,
  utils,
} from '@noble/ed25519';
import {
  encodeStrkey,
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_ED25519_PRIVATE,
  type DecoratedSignature,
  type MuxedAccount,
  type AccountID,
} from '@stellar/xdr';

export class Keypair {
  readonly rawPublicKey: Uint8Array;
  private readonly _rawSecretKey: Uint8Array | null;

  private constructor(publicKey: Uint8Array, secretKey: Uint8Array | null) {
    this.rawPublicKey = publicKey;
    this._rawSecretKey = secretKey;
  }

  static async random(): Promise<Keypair> {
    const secret = utils.randomPrivateKey();
    const pub = await getPublicKeyAsync(secret);
    return new Keypair(pub, secret);
  }

  static async fromSecret(sAddress: string): Promise<Keypair> {
    const { version, payload } = decodeStrkey(sAddress);
    if (version !== STRKEY_ED25519_PRIVATE) {
      throw new Error('Expected ed25519 secret key (S-address)');
    }
    const pub = await getPublicKeyAsync(payload);
    return new Keypair(pub, payload);
  }

  static async fromRawSecret(bytes: Uint8Array): Promise<Keypair> {
    if (bytes.length !== 32) {
      throw new Error('Secret key must be 32 bytes');
    }
    const pub = await getPublicKeyAsync(bytes);
    return new Keypair(pub, bytes);
  }

  static fromPublicKey(gAddress: string): Keypair {
    const { version, payload } = decodeStrkey(gAddress);
    if (version !== STRKEY_ED25519_PUBLIC) {
      throw new Error('Expected ed25519 public key (G-address)');
    }
    return new Keypair(payload, null);
  }

  static fromRawPublicKey(bytes: Uint8Array): Keypair {
    if (bytes.length !== 32) {
      throw new Error('Public key must be 32 bytes');
    }
    return new Keypair(bytes, null);
  }

  get publicKey(): string {
    return encodeStrkey(STRKEY_ED25519_PUBLIC, this.rawPublicKey);
  }

  get secret(): string {
    if (this._rawSecretKey === null) {
      throw new Error('No secret key available (public-only keypair)');
    }
    return encodeStrkey(STRKEY_ED25519_PRIVATE, this._rawSecretKey);
  }

  get rawSecretKey(): Uint8Array {
    if (this._rawSecretKey === null) {
      throw new Error('No secret key available (public-only keypair)');
    }
    return this._rawSecretKey;
  }

  canSign(): boolean {
    return this._rawSecretKey !== null;
  }

  signatureHint(): Uint8Array {
    return this.rawPublicKey.slice(-4);
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    if (this._rawSecretKey === null) {
      throw new Error('Cannot sign: no secret key available');
    }
    return signAsync(data, this._rawSecretKey);
  }

  async signDecorated(data: Uint8Array): Promise<DecoratedSignature> {
    const signature = await this.sign(data);
    return { hint: this.signatureHint(), signature };
  }

  async verify(data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return verifyAsync(signature, data, this.rawPublicKey);
  }

  toMuxedAccount(): MuxedAccount {
    return { Ed25519: this.rawPublicKey };
  }

  toAccountId(): AccountID {
    return { PublicKeyTypeEd25519: this.rawPublicKey };
  }
}
