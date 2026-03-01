/**
 * getLiquidityPoolId — compute LP ID from asset pair.
 */

import { LiquidityPoolParameters } from '@stellar/xdr';
import { hash } from './signing.js';
import { Asset } from './asset.js';

/**
 * Compute a liquidity pool ID.
 * Signature: getLiquidityPoolId("constant_product", { assetA, assetB, fee })
 * Returns a Buffer-like Uint8Array with .toString('hex').
 */
export function getLiquidityPoolId(
  liquidityPoolType?: any,
  parameters?: any,
): any {
  // Validate pool type
  if (liquidityPoolType !== 'constant_product') {
    throw new Error('liquidityPoolType is invalid');
  }

  const params = parameters || {};

  // Validate assetA
  if (!(params.assetA instanceof Asset)) {
    throw new Error('assetA is invalid');
  }

  // Validate assetB
  if (!(params.assetB instanceof Asset)) {
    throw new Error('assetB is invalid');
  }

  // Validate fee
  if (typeof params.fee !== 'number') {
    throw new Error('fee is invalid');
  }

  const assetA: Asset = params.assetA;
  const assetB: Asset = params.assetB;
  const fee: number = params.fee;

  // Validate lexicographic ordering
  const cmp = Asset.compare(assetA, assetB);
  if (cmp >= 0) {
    throw new Error('Assets are not in lexicographic order');
  }

  const modernParams = {
    LiquidityPoolConstantProduct: {
      assetA: (assetA as any)._toModern(),
      assetB: (assetB as any)._toModern(),
      fee,
    },
  };

  const bytes = LiquidityPoolParameters.toXdr(modernParams);
  return hash(bytes);
}
