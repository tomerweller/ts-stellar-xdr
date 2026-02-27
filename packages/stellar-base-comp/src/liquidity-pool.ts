/**
 * getLiquidityPoolId — compute LP ID from asset pair.
 */

import { LiquidityPoolParameters } from '@stellar/xdr';
import { hash } from './signing.js';
import type { Asset } from './asset.js';

const LIQUIDITY_POOL_FEE = 30;

/** Numeric rank for asset type ordering (matches XDR discriminant order) */
const TYPE_RANK: Record<string, number> = {
  native: 0,
  credit_alphanum4: 1,
  credit_alphanum12: 2,
};

/** Compare assets for lexicographic ordering */
function compareAssets(a: Asset, b: Asset): number {
  const typeA = a.getAssetType();
  const typeB = b.getAssetType();
  const rankA = TYPE_RANK[typeA] ?? 99;
  const rankB = TYPE_RANK[typeB] ?? 99;
  if (rankA !== rankB) return rankA - rankB;
  if (typeA === 'native') return 0; // both native = equal
  const codeA = a.getCode();
  const codeB = b.getCode();
  if (codeA !== codeB) return codeA < codeB ? -1 : 1;
  const issuerA = a.getIssuer() ?? '';
  const issuerB = b.getIssuer() ?? '';
  if (issuerA !== issuerB) return issuerA < issuerB ? -1 : 1;
  return 0;
}

/**
 * Compute a liquidity pool ID.
 * Supports both the official SDK signature `(type, { assetA, assetB, fee })`
 * and the simplified `(assetA, assetB, fee?)` form.
 * Returns a 64-character hex string.
 */
export function getLiquidityPoolId(
  typeOrAssetA: string | Asset,
  parametersOrAssetB?: any,
  fee?: number,
): any {
  let assetA: Asset;
  let assetB: Asset;
  let poolFee: number;

  if (typeof typeOrAssetA === 'string') {
    // Official SDK signature: getLiquidityPoolId("constant_product", { assetA, assetB, fee })
    const params = parametersOrAssetB as { assetA: Asset; assetB: Asset; fee: number };
    assetA = params.assetA;
    assetB = params.assetB;
    poolFee = params.fee ?? LIQUIDITY_POOL_FEE;
  } else {
    // Simplified: getLiquidityPoolId(assetA, assetB, fee?)
    assetA = typeOrAssetA;
    assetB = parametersOrAssetB as Asset;
    poolFee = fee ?? LIQUIDITY_POOL_FEE;
  }

  // Validate: assetA must be strictly less than assetB in lexicographic order
  const cmp = compareAssets(assetA, assetB);
  if (cmp >= 0) {
    throw new Error('Assets are not in lexicographic order');
  }

  const params = {
    LiquidityPoolConstantProduct: {
      assetA: assetA._toModern(),
      assetB: assetB._toModern(),
      fee: poolFee,
    },
  };

  const bytes = LiquidityPoolParameters.toXdr(params);
  const poolHash = hash(bytes);
  return poolHash.toString('hex');
}
