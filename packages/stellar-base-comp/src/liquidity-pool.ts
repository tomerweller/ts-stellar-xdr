/**
 * getLiquidityPoolId — compute LP ID from asset pair.
 */

import { LiquidityPoolParameters } from '@stellar/xdr';
import { hash } from './signing.js';
import type { Asset } from './asset.js';

const LIQUIDITY_POOL_FEE = 30;

/**
 * Compute a liquidity pool ID from two assets.
 * The pool ID is SHA-256(LiquidityPoolParameters).
 */
export function getLiquidityPoolId(
  assetA: Asset,
  assetB: Asset,
  fee: number = LIQUIDITY_POOL_FEE,
): string {
  if (assetA.compare(assetB) >= 0) {
    throw new Error('Assets must be in lexicographic order (assetA < assetB)');
  }

  const params = {
    LiquidityPoolConstantProduct: {
      assetA: assetA._toModern(),
      assetB: assetB._toModern(),
      fee,
    },
  };

  const bytes = LiquidityPoolParameters.toXdr(params);
  const poolHash = hash(bytes);

  let hex = '';
  for (let i = 0; i < poolHash.length; i++) {
    hex += poolHash[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}
