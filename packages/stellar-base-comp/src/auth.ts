/**
 * Soroban auth helpers — authorizeEntry / authorizeInvocation
 * Works with compat XDR objects (method-accessor style) and returns compat objects.
 */

import {
  type SorobanAuthorizationEntry as ModernSorobanAuthorizationEntry,
  HashIDPreimage as HashIDPreimageCodec,
  SorobanAuthorizationEntry as SorobanAuthorizationEntryCodec,
} from '@stellar/xdr';
import {
  SorobanAuthorizationEntry as CompatSorobanAuthorizationEntry,
  SorobanCredentials as CompatSorobanCredentials,
  SorobanAddressCredentials as CompatSorobanAddressCredentials,
  HashIdPreimage as CompatHashIdPreimage,
  HashIdPreimageSorobanAuthorization as CompatHashIdPreimageSorobanAuthorization,
  ScVal as CompatScVal,
  ScAddress as CompatScAddress,
  PublicKey as CompatPublicKey,
} from './generated/stellar_compat.js';
import { Hyper } from './xdr-compat/hyper.js';
import { decodeStrkey, encodeStrkey, STRKEY_ED25519_PUBLIC } from '@stellar/strkey';
import type { Keypair } from './keypair.js';
import { sha256 } from '@noble/hashes/sha256';
import { verify as ed25519Verify } from '@noble/ed25519';

const encoder = new TextEncoder();

/**
 * Helper to check if a value is a compat XDR object (has _toModern method).
 */
function isCompat(v: any): boolean {
  return v && typeof v === 'object' && typeof v._toModern === 'function';
}

/**
 * Convert a compat or modern SorobanAuthorizationEntry to modern format.
 */
function toModernEntry(entry: any): ModernSorobanAuthorizationEntry {
  if (isCompat(entry)) {
    return entry._toModern();
  }
  return entry;
}

/**
 * Convert a modern SorobanAuthorizationEntry to compat format.
 */
function toCompatEntry(modern: ModernSorobanAuthorizationEntry): any {
  return (CompatSorobanAuthorizationEntry as any)._fromModern(modern);
}

/**
 * Extract the raw public key bytes from the address in SorobanAddressCredentials.
 * Works with both compat and modern address formats.
 */
function extractPublicKeyFromAddress(address: any): Uint8Array | null {
  if (isCompat(address)) {
    // Compat ScAddress — check if it's an account type
    try {
      const accountId = address.accountId(); // compat PublicKey union
      if (isCompat(accountId)) {
        return accountId.ed25519(); // raw Uint8Array
      }
      return null;
    } catch {
      return null;
    }
  }
  // Modern format: { Account: { PublicKeyTypeEd25519: Uint8Array } }
  if (address && address.Account) {
    return address.Account.PublicKeyTypeEd25519 || address.Account;
  }
  return null;
}

/**
 * Authorize a Soroban authorization entry by signing it with a keypair or callback.
 *
 * If the entry uses SourceAccount credentials, it is returned unchanged.
 * For Address credentials, the hash preimage is built, signed, and the
 * signature field is updated with a standard Vec([Map({public_key, signature})]).
 *
 * The callback signer receives a compat HashIdPreimage object (with .toXDR()).
 * Returns a compat SorobanAuthorizationEntry.
 */
export async function authorizeEntry(
  entry: any,
  signer: any,
  validUntilLedgerSeq: number,
  networkPassphrase?: string,
): Promise<any> {
  // Parse from base64 if string
  let authEntry: any;
  if (typeof entry === 'string') {
    const modern = SorobanAuthorizationEntryCodec.fromBase64(entry);
    authEntry = toCompatEntry(modern);
  } else if (isCompat(entry)) {
    authEntry = entry;
  } else {
    // Modern entry — convert to compat
    authEntry = toCompatEntry(entry);
  }

  // Get the credentials (compat union)
  const credentials = authEntry.credentials();

  // If not address credentials (SourceAccount), return unchanged
  const switchName = credentials.switch().name || credentials.switch();
  if (switchName === 'sorobanCredentialsSourceAccount') {
    return authEntry;
  }

  // Get the address credentials (compat struct)
  const addrCreds = credentials.address();

  // Extract the nonce as a Hyper (compat Int64)
  const nonce = addrCreds.nonce();
  // Get the address (compat ScAddress)
  const credAddress = addrCreds.address();
  // Get the rootInvocation (compat SorobanAuthorizedInvocation)
  const rootInvocation = authEntry.rootInvocation();

  // Determine signer's public key for identity check
  let signerPubKey: Uint8Array | undefined;
  if (typeof signer !== 'function' && signer.rawPublicKey) {
    signerPubKey = signer.rawPublicKey();
  }

  // Identity check: if signer is a Keypair, verify the signer's public key
  // matches the credential address
  if (signerPubKey) {
    const credPubKey = extractPublicKeyFromAddress(credAddress);
    if (credPubKey) {
      const signerKeyStr = encodeStrkey(STRKEY_ED25519_PUBLIC, signerPubKey);
      const credKeyStr = encodeStrkey(STRKEY_ED25519_PUBLIC, credPubKey);
      if (signerKeyStr !== credKeyStr) {
        throw new Error(
          "signer's identity doesn't match the entry's credential address"
        );
      }
    }
  }

  // Build the hash preimage as a compat object
  const networkId = sha256(encoder.encode(networkPassphrase ?? ''));

  const preimageSorobanAuth = new (CompatHashIdPreimageSorobanAuthorization as any)({
    networkId: networkId,
    nonce: nonce,
    signatureExpirationLedger: validUntilLedgerSeq,
    invocation: rootInvocation,
  });

  const preimage = (CompatHashIdPreimage as any).envelopeTypeSorobanAuthorization(
    preimageSorobanAuth
  );

  // Serialize the preimage to XDR bytes, then SHA-256 hash
  const preimageXdr = preimage.toXDR();
  const payload = sha256(preimageXdr);

  // Sign the payload
  let sigBytes: Uint8Array;
  let publicKeyBytes: Uint8Array;

  if (typeof signer === 'function') {
    // Callback signer — pass the compat HashIdPreimage object
    const result = await signer(preimage);
    if (result && typeof result === 'object' && 'signature' in result) {
      sigBytes = result.signature;
      if (typeof result.publicKey === 'string') {
        const decoded = decodeStrkey(result.publicKey);
        publicKeyBytes = decoded.payload;
      } else {
        publicKeyBytes = new Uint8Array(32);
      }
    } else {
      sigBytes = result as Uint8Array;
      // For bare callback without publicKey, we can't determine it
      // Use the credential address's public key
      const credPubKey = extractPublicKeyFromAddress(credAddress);
      publicKeyBytes = credPubKey ?? new Uint8Array(32);
    }
  } else {
    // Keypair signer
    sigBytes = signer.sign(payload);
    publicKeyBytes = signer.rawPublicKey();
  }

  // Verify the signature matches the payload
  if (typeof signer === 'function') {
    const valid = ed25519Verify(sigBytes, payload, publicKeyBytes);
    if (!valid) {
      throw new Error("signature doesn't match the entry or is invalid");
    }
  }

  // Build the signature ScVal as compat: scvVec([scvMap([{key: symbol('public_key'), val: bytes(...)}, {key: symbol('signature'), val: bytes(...)}])])
  const pubKeyScVal = (CompatScVal as any).scvBytes(publicKeyBytes);
  const sigScVal = (CompatScVal as any).scvBytes(sigBytes);
  const pubKeySymbol = (CompatScVal as any).scvSymbol('public_key');
  const sigSymbol = (CompatScVal as any).scvSymbol('signature');

  // Build the map entry: Map([{key: Symbol('public_key'), val: Bytes(pubkey)}, {key: Symbol('signature'), val: Bytes(sig)}])
  // In the official SDK, the signature is a ScVal::Vec([ScVal::Map([...])])
  // But scValToNative for a Map returns an object with the keys as properties
  // For the test, scValToNative expects {public_key: Uint8Array, signature: Uint8Array}

  // Import ScMapEntry for the map
  const { ScMapEntry } = await import('./generated/stellar_compat.js');

  const mapEntry1 = new (ScMapEntry as any)({
    key: pubKeySymbol,
    val: pubKeyScVal,
  });
  const mapEntry2 = new (ScMapEntry as any)({
    key: sigSymbol,
    val: sigScVal,
  });

  const mapScVal = (CompatScVal as any).scvMap([mapEntry1, mapEntry2]);
  const signatureScVal = (CompatScVal as any).scvVec([mapScVal]);

  // Build the new address credentials with updated signature and expiration
  const newAddrCreds = new (CompatSorobanAddressCredentials as any)({
    address: credAddress,
    nonce: nonce,
    signatureExpirationLedger: validUntilLedgerSeq,
    signature: signatureScVal,
  });

  // Build the new credentials union
  const newCredentials = (CompatSorobanCredentials as any).sorobanCredentialsAddress(newAddrCreds);

  // Build the new entry
  const newEntry = new (CompatSorobanAuthorizationEntry as any)({
    credentials: newCredentials,
    rootInvocation: rootInvocation,
  });

  return newEntry;
}

/**
 * Create and sign a new SorobanAuthorizationEntry from an invocation.
 * Generates a random nonce, builds credentials from the signer's public key,
 * then delegates to authorizeEntry for signing.
 *
 * The invocation can be a compat or modern SorobanAuthorizedInvocation.
 * Returns a compat SorobanAuthorizationEntry.
 */
export async function authorizeInvocation(
  signer: any,
  validUntilLedgerSeq: number,
  invocation: any,
  publicKey?: string,
  networkPassphrase?: string,
): Promise<any> {
  // Generate random nonce (64-bit)
  const nonceBytes = crypto.getRandomValues(new Uint8Array(8));
  const view = new DataView(nonceBytes.buffer);
  const nonce = view.getBigInt64(0);
  const nonceHyper = Hyper.fromBigInt(nonce);

  // Determine the public key
  let pubKeyRaw: Uint8Array;
  if (publicKey) {
    const decoded = decodeStrkey(publicKey);
    pubKeyRaw = decoded.payload;
  } else if (typeof signer !== 'function') {
    pubKeyRaw = signer.rawPublicKey();
  } else {
    throw new Error('publicKey is required when using a signing callback');
  }

  // Build the compat ScAddress from the public key
  const pubKeyUnion = (CompatPublicKey as any).publicKeyTypeEd25519(pubKeyRaw);
  const address = (CompatScAddress as any).scAddressTypeAccount(pubKeyUnion);

  // Build empty signature
  const emptySignature = (CompatScVal as any).scvVec([]);

  // Build a preliminary entry with empty signature
  const addrCreds = new (CompatSorobanAddressCredentials as any)({
    address: address,
    nonce: nonceHyper,
    signatureExpirationLedger: validUntilLedgerSeq,
    signature: emptySignature,
  });

  const credentials = (CompatSorobanCredentials as any).sorobanCredentialsAddress(addrCreds);

  // Ensure invocation is compat
  let compatInvocation = invocation;
  if (!isCompat(invocation)) {
    // Modern invocation — import and convert
    const { SorobanAuthorizedInvocation } = await import('./generated/stellar_compat.js');
    compatInvocation = (SorobanAuthorizedInvocation as any)._fromModern(invocation);
  }

  const entry = new (CompatSorobanAuthorizationEntry as any)({
    credentials: credentials,
    rootInvocation: compatInvocation,
  });

  // Delegate to authorizeEntry for the actual signing
  return authorizeEntry(
    entry,
    signer,
    validUntilLedgerSeq,
    networkPassphrase ?? '',
  );
}
