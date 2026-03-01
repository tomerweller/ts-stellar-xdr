/**
 * LiquidityPoolAsset — compat class matching js-stellar-base.
 * Wraps a pair of assets + fee for liquidity pool trust lines.
 */

import { Asset } from './asset.js';
import {
  ChangeTrustAsset as CompatChangeTrustAsset,
  LiquidityPoolParameters as CompatLiquidityPoolParameters,
  LiquidityPoolConstantProductParameters as CompatLPCPP,
} from './generated/stellar_compat.js';
import { getLiquidityPoolId } from './liquidity-pool.js';

export class LiquidityPoolAsset {
  private readonly _assetA: Asset;
  private readonly _assetB: Asset;
  private readonly _fee: number;

  constructor(assetA?: any, assetB?: any, fee?: any) {
    if (!(assetA instanceof Asset)) {
      throw new Error('assetA is invalid');
    }
    if (!(assetB instanceof Asset)) {
      throw new Error('assetB is invalid');
    }

    // Validate lexicographic ordering (check before fee to match js-stellar-base behavior)
    const cmp = Asset.compare(assetA, assetB);
    if (cmp >= 0) {
      throw new Error('Assets are not in lexicographic order');
    }

    if (typeof fee !== 'number') {
      throw new Error('fee is invalid');
    }

    this._assetA = assetA;
    this._assetB = assetB;
    this._fee = fee;
  }

  getLiquidityPoolParameters(): { assetA: Asset; assetB: Asset; fee: number } {
    return {
      assetA: this._assetA,
      assetB: this._assetB,
      fee: this._fee,
    };
  }

  getAssetType(): string {
    return 'liquidity_pool_shares';
  }

  toXDRObject(): any {
    const assetAXdr = (this._assetA as any).toXDRObject();
    const assetBXdr = (this._assetB as any).toXDRObject();
    const lpParams = new (CompatLPCPP as any)({
      assetA: assetAXdr,
      assetB: assetBXdr,
      fee: this._fee,
    });
    const poolParams = new (CompatLiquidityPoolParameters as any)(
      'liquidityPoolConstantProduct',
      lpParams,
    );
    return new (CompatChangeTrustAsset as any)(
      'assetTypePoolShare',
      poolParams,
    );
  }

  static fromOperation(xdr: any): LiquidityPoolAsset {
    // xdr is a compat ChangeTrustAsset union
    const armName = xdr.arm();
    if (armName !== 'liquidityPool') {
      // Get the switch name for the error message
      const sw = xdr.switch();
      const switchName = typeof sw === 'string' ? sw : (sw && sw.name) || String(sw);
      throw new Error(`Invalid asset type: ${switchName}`);
    }

    // Get the LiquidityPoolParameters union
    const poolParamsXdr = xdr.liquidityPool();
    // Get the constant product parameters struct
    const cpParams = poolParamsXdr.constantProduct();
    const assetAXdr = cpParams.assetA();
    const assetBXdr = cpParams.assetB();
    const fee = cpParams.fee();

    const assetA = Asset.fromOperation(assetAXdr);
    const assetB = Asset.fromOperation(assetBXdr);

    return new LiquidityPoolAsset(assetA, assetB, fee);
  }

  equals(other: LiquidityPoolAsset): boolean {
    return (
      this._assetA.equals(other._assetA) &&
      this._assetB.equals(other._assetB) &&
      this._fee === other._fee
    );
  }

  toString(): string {
    const poolId = getLiquidityPoolId('constant_product', {
      assetA: this._assetA,
      assetB: this._assetB,
      fee: this._fee,
    });
    // getLiquidityPoolId returns a Buffer-like with toString('hex')
    const hex = typeof poolId === 'string' ? poolId : poolId.toString('hex');
    return `liquidity_pool:${hex}`;
  }
}
