/**
 * Compute the contract ID for a Stellar asset (SAC — Stellar Asset Contract).
 */

import {
  HashIDPreimage,
  type Asset,
  encodeStrkey,
  STRKEY_CONTRACT,
} from '@stellar/xdr';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Compute the contract address (C-address) for a given asset on a specific network.
 *
 * @param asset - XDR Asset value ('Native' | { CreditAlphanum4: ... } | { CreditAlphanum12: ... })
 * @param networkPassphrase - Network passphrase (e.g. "Test SDF Network ; September 2015")
 * @returns C-address string
 */
export function getAssetContractId(
  asset: Asset,
  networkPassphrase: string,
): string {
  const networkID = sha256(new TextEncoder().encode(networkPassphrase));

  const preimage: import('@stellar/xdr').HashIDPreimage = {
    ContractId: {
      networkID,
      contractIDPreimage: { Asset: asset },
    },
  };

  const xdrBytes = HashIDPreimage.toXdr(preimage);
  const contractHash = sha256(xdrBytes);

  return encodeStrkey(STRKEY_CONTRACT, contractHash);
}
