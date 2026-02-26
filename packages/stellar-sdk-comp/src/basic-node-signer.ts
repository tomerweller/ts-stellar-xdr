/**
 * basicNodeSigner — helper for signing transactions with a keypair.
 * Compatible with js-stellar-sdk.
 */

import { Keypair } from '@stellar/stellar-base-comp';

export interface Signer {
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string },
  ): Promise<string>;
  signAuthEntry(
    entryXdr: string,
    opts?: { networkPassphrase?: string },
  ): Promise<string>;
}

export function basicNodeSigner(keypair: Keypair, networkPassphrase: string): Signer {
  return {
    async signTransaction(xdr: string): Promise<string> {
      // Parse the transaction, sign it, return the signed XDR
      const { TransactionBuilder } = await import('@stellar/stellar-base-comp');
      const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
      tx.sign(keypair);
      return tx.toXDR();
    },

    async signAuthEntry(entryXdr: string): Promise<string> {
      // Stub — return as-is for now
      return entryXdr;
    },
  };
}
