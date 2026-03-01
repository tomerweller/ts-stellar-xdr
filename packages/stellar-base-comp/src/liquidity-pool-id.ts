/**
 * LiquidityPoolId class matching js-stellar-base.
 * Wraps a pool ID hex string for TrustLine operations.
 */

import {
  TrustLineAsset as CompatTrustLineAsset,
} from './generated/stellar_compat.js';
import { augmentBuffer } from './signing.js';

/** Convert hex string to Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Convert Uint8Array to hex string */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export class LiquidityPoolId {
  private readonly _poolId: string;

  constructor(liquidityPoolId?: any) {
    if (!liquidityPoolId) {
      throw new Error('liquidityPoolId cannot be empty');
    }
    if (typeof liquidityPoolId !== 'string' || !/^[0-9a-f]{64}$/.test(liquidityPoolId)) {
      throw new Error('Liquidity pool ID is not a valid hash');
    }
    this._poolId = liquidityPoolId;
  }

  get liquidityPoolId(): string { return this._poolId; }

  static fromOperation(tlAssetXdr: any): LiquidityPoolId {
    const armName = tlAssetXdr.arm();
    if (armName !== 'liquidityPoolId') {
      const sw = tlAssetXdr.switch();
      const switchName = typeof sw === 'string' ? sw : (sw && sw.name) || String(sw);
      throw new Error(`Invalid asset type: ${switchName}`);
    }

    // Get the pool ID bytes
    const poolIdValue = tlAssetXdr.liquidityPoolId();
    let hex: string;
    if (poolIdValue instanceof Uint8Array) {
      hex = bytesToHex(poolIdValue);
    } else if (typeof poolIdValue.toString === 'function') {
      hex = poolIdValue.toString('hex');
    } else {
      throw new Error('Cannot extract pool ID');
    }
    return new LiquidityPoolId(hex);
  }

  toXDRObject(): any {
    const bytes = augmentBuffer(hexToBytes(this._poolId));
    return new (CompatTrustLineAsset as any)('assetTypePoolShare', bytes);
  }

  getLiquidityPoolId(): string {
    return this._poolId;
  }

  getAssetType(): string {
    return 'liquidity_pool_shares';
  }

  equals(other: LiquidityPoolId): boolean {
    return this._poolId === other._poolId;
  }

  toString(): string {
    return `liquidity_pool:${this._poolId}`;
  }
}
