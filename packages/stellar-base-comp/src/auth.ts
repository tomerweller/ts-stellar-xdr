/**
 * Soroban auth helpers — authorizeEntry / authorizeInvocation
 * Stubs for API compatibility, delegating to modern types.
 */

import type {
  SorobanAuthorizationEntry,
  SorobanAuthorizedInvocation,
} from '@stellar/xdr';
import type { Keypair } from './keypair.js';
import { hash } from './signing.js';

/**
 * Authorize a Soroban authorization entry by signing it with a keypair.
 * This is a simplified implementation.
 */
export async function authorizeEntry(
  entry: SorobanAuthorizationEntry,
  signer: Keypair | ((preimage: Uint8Array) => Promise<Uint8Array>),
  validUntilLedgerSeq: number,
  networkPassphrase: string,
): Promise<SorobanAuthorizationEntry> {
  // This is a stub — full implementation would serialize the auth preimage,
  // sign it, and update the entry's credentials.
  // For now, return the entry as-is for API shape compatibility.
  return entry;
}

export async function authorizeInvocation(
  signer: Keypair | ((preimage: Uint8Array) => Promise<Uint8Array>),
  validUntilLedgerSeq: number,
  invocation: SorobanAuthorizedInvocation,
  publicKey?: string,
  networkPassphrase?: string,
): Promise<SorobanAuthorizationEntry> {
  // Stub — return a basic entry structure
  return {
    credentials: 'SourceAccount',
    rootInvocation: invocation,
  } as any;
}
