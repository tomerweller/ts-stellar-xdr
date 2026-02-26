import {
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
  type AccountID,
  type MuxedAccount,
  type Asset,
  type Memo,
} from '@stellar/xdr';

const encoder = new TextEncoder();

export function parsePublicKey(gAddress: string): AccountID {
  const { version, payload } = decodeStrkey(gAddress);
  if (version !== STRKEY_ED25519_PUBLIC) {
    throw new Error('Expected ed25519 public key (G-address)');
  }
  return { PublicKeyTypeEd25519: payload };
}

export function parseMuxedAccount(address: string): MuxedAccount {
  const { version, payload } = decodeStrkey(address);
  if (version === STRKEY_ED25519_PUBLIC) {
    return { Ed25519: payload };
  }
  if (version === STRKEY_MUXED_ED25519) {
    const ed25519 = payload.slice(0, 32);
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const id = view.getBigUint64(32, false);
    return { MuxedEd25519: { id, ed25519 } };
  }
  throw new Error(`Expected G-address or M-address, got version byte ${version}`);
}

export function nativeAsset(): Asset {
  return 'Native';
}

export function creditAsset(code: string, issuer: string): Asset {
  const codeBytes = encoder.encode(code);
  const accountId = parsePublicKey(issuer);
  if (codeBytes.length >= 1 && codeBytes.length <= 4) {
    const padded = new Uint8Array(4);
    padded.set(codeBytes);
    return { CreditAlphanum4: { assetCode: padded, issuer: accountId } };
  }
  if (codeBytes.length >= 5 && codeBytes.length <= 12) {
    const padded = new Uint8Array(12);
    padded.set(codeBytes);
    return { CreditAlphanum12: { assetCode: padded, issuer: accountId } };
  }
  throw new Error(`Asset code must be 1-12 ASCII characters, got ${codeBytes.length} bytes`);
}

export function memoNone(): Memo {
  return 'None';
}

export function memoText(text: string): Memo {
  const bytes = encoder.encode(text);
  if (bytes.length > 28) {
    throw new Error(`Memo text must be ≤28 bytes UTF-8, got ${bytes.length} bytes`);
  }
  return { Text: text };
}

export function memoId(id: bigint): Memo {
  if (id < 0n || id > 18446744073709551615n) {
    throw new Error('Memo ID must be a uint64 (0 to 2^64-1)');
  }
  return { Id: id };
}

export function memoHash(hash: Uint8Array): Memo {
  if (hash.length !== 32) {
    throw new Error('Memo hash must be exactly 32 bytes');
  }
  return { Hash: hash };
}

export function memoReturn(hash: Uint8Array): Memo {
  if (hash.length !== 32) {
    throw new Error('Memo return hash must be exactly 32 bytes');
  }
  return { Return: hash };
}
