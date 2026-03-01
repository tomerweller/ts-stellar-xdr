/**
 * The `xdr` namespace object — collects all compat XDR types into a single
 * object matching js-stellar-base's `xdr` export.
 *
 * Re-exports everything from the generated stellar_compat.ts which provides
 * typed interfaces, runtime registrations, and typed exports for all XDR types.
 */

export * from './stellar_compat.js';

// Additional utility functions matching js-stellar-base's xdr namespace

import { ScVal } from './stellar_compat.js';

/**
 * Sort an array of ScMapEntry objects by their key and wrap in an ScVal.scvMap.
 * Matches js-stellar-base's xdr.scvSortedMap utility.
 */
export function scvSortedMap(entries: any[]): any {
  // Sort entries by comparing their key XDR representations
  const sorted = [...entries].sort((a: any, b: any) => {
    const aXdr = a.key().toXDR('hex');
    const bXdr = b.key().toXDR('hex');
    if (aXdr < bXdr) return -1;
    if (aXdr > bXdr) return 1;
    return 0;
  });
  return (ScVal as any).scvMap(sorted);
}
