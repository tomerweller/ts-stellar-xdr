/**
 * Operation class compatible with js-stellar-base.
 * Static factories that accept string amounts and return compat xdr.Operation instances.
 */

import {
  createAccount as modernCreateAccount,
  payment as modernPayment,
  pathPaymentStrictReceive as modernPathPaymentStrictReceive,
  pathPaymentStrictSend as modernPathPaymentStrictSend,
  manageSellOffer as modernManageSellOffer,
  manageBuyOffer as modernManageBuyOffer,
  createPassiveSellOffer as modernCreatePassiveSellOffer,
  setOptions as modernSetOptions,
  changeTrust as modernChangeTrust,
  allowTrust as modernAllowTrust,
  accountMerge as modernAccountMerge,
  inflation as modernInflation,
  manageData as modernManageData,
  bumpSequence as modernBumpSequence,
  createClaimableBalance as modernCreateClaimableBalance,
  claimClaimableBalance as modernClaimClaimableBalance,
  beginSponsoringFutureReserves as modernBeginSponsoringFutureReserves,
  endSponsoringFutureReserves as modernEndSponsoringFutureReserves,
  clawback as modernClawback,
  clawbackClaimableBalance as modernClawbackClaimableBalance,
  setTrustLineFlags as modernSetTrustLineFlags,
  liquidityPoolDeposit as modernLiquidityPoolDeposit,
  liquidityPoolWithdraw as modernLiquidityPoolWithdraw,
  invokeHostFunction as modernInvokeHostFunction,
  extendFootprintTtl as modernExtendFootprintTtl,
  restoreFootprint as modernRestoreFootprint,
} from '@stellar/tx-builder';
import { Operation as CompatOperationXdr } from './generated/stellar_compat.js';
import { Asset } from './asset.js';
import { amountToBigInt, toStroops, fromStroops } from './amount.js';

function wrap(modernOp: any): any {
  return (CompatOperationXdr as any)._fromModern(modernOp);
}

function priceObj(price: string | { n: number; d: number }): { n: number; d: number } {
  if (typeof price === 'string') {
    return approximatePrice(price);
  }
  return price;
}

function approximatePrice(price: string): { n: number; d: number } {
  const parts = price.split('/');
  if (parts.length === 2) {
    return { n: parseInt(parts[0]!, 10), d: parseInt(parts[1]!, 10) };
  }
  // Simple fraction approximation
  const val = parseFloat(price);
  if (Number.isInteger(val)) {
    return { n: val, d: 1 };
  }
  // Use continued fraction approximation
  const maxDenom = 10000000;
  let bestN = 0, bestD = 1;
  let minErr = Math.abs(val);
  for (let d = 1; d <= maxDenom; d++) {
    const n = Math.round(val * d);
    const err = Math.abs(n / d - val);
    if (err < minErr) {
      minErr = err;
      bestN = n;
      bestD = d;
      if (err === 0) break;
    }
  }
  return { n: bestN, d: bestD };
}

interface OperationOpts {
  source?: string;
}

export class Operation {
  static createAccount(opts: OperationOpts & { destination: string; startingBalance: string }) {
    return wrap(modernCreateAccount({
      destination: opts.destination,
      startingBalance: amountToBigInt(opts.startingBalance),
      source: opts.source,
    }));
  }

  static payment(opts: OperationOpts & { destination: string; asset: Asset; amount: string }) {
    return wrap(modernPayment({
      destination: opts.destination,
      asset: opts.asset._toModern(),
      amount: amountToBigInt(opts.amount),
      source: opts.source,
    }));
  }

  static pathPaymentStrictReceive(opts: OperationOpts & {
    sendAsset: Asset; sendMax: string; destination: string;
    destAsset: Asset; destAmount: string; path: Asset[];
  }) {
    return wrap(modernPathPaymentStrictReceive({
      sendAsset: opts.sendAsset._toModern(),
      sendMax: amountToBigInt(opts.sendMax),
      destination: opts.destination,
      destAsset: opts.destAsset._toModern(),
      destAmount: amountToBigInt(opts.destAmount),
      path: opts.path.map(a => a._toModern()),
      source: opts.source,
    }));
  }

  static pathPaymentStrictSend(opts: OperationOpts & {
    sendAsset: Asset; sendAmount: string; destination: string;
    destAsset: Asset; destMin: string; path: Asset[];
  }) {
    return wrap(modernPathPaymentStrictSend({
      sendAsset: opts.sendAsset._toModern(),
      sendAmount: amountToBigInt(opts.sendAmount),
      destination: opts.destination,
      destAsset: opts.destAsset._toModern(),
      destMin: amountToBigInt(opts.destMin),
      path: opts.path.map(a => a._toModern()),
      source: opts.source,
    }));
  }

  static manageSellOffer(opts: OperationOpts & {
    selling: Asset; buying: Asset; amount: string;
    price: string | { n: number; d: number }; offerId?: string;
  }) {
    return wrap(modernManageSellOffer({
      selling: opts.selling._toModern(),
      buying: opts.buying._toModern(),
      amount: amountToBigInt(opts.amount),
      price: priceObj(opts.price),
      offerID: opts.offerId ? BigInt(opts.offerId) : undefined,
      source: opts.source,
    }));
  }

  static manageBuyOffer(opts: OperationOpts & {
    selling: Asset; buying: Asset; buyAmount: string;
    price: string | { n: number; d: number }; offerId?: string;
  }) {
    return wrap(modernManageBuyOffer({
      selling: opts.selling._toModern(),
      buying: opts.buying._toModern(),
      buyAmount: amountToBigInt(opts.buyAmount),
      price: priceObj(opts.price),
      offerID: opts.offerId ? BigInt(opts.offerId) : undefined,
      source: opts.source,
    }));
  }

  static createPassiveSellOffer(opts: OperationOpts & {
    selling: Asset; buying: Asset; amount: string;
    price: string | { n: number; d: number };
  }) {
    return wrap(modernCreatePassiveSellOffer({
      selling: opts.selling._toModern(),
      buying: opts.buying._toModern(),
      amount: amountToBigInt(opts.amount),
      price: priceObj(opts.price),
      source: opts.source,
    }));
  }

  static setOptions(opts: OperationOpts & {
    inflationDest?: string; clearFlags?: number; setFlags?: number;
    masterWeight?: number; lowThreshold?: number; medThreshold?: number;
    highThreshold?: number; homeDomain?: string; signer?: any;
  }) {
    return wrap(modernSetOptions({
      inflationDest: opts.inflationDest,
      clearFlags: opts.clearFlags,
      setFlags: opts.setFlags,
      masterWeight: opts.masterWeight,
      lowThreshold: opts.lowThreshold,
      medThreshold: opts.medThreshold,
      highThreshold: opts.highThreshold,
      homeDomain: opts.homeDomain,
      signer: opts.signer,
      source: opts.source,
    }));
  }

  static changeTrust(opts: OperationOpts & { asset: Asset; limit?: string }) {
    return wrap(modernChangeTrust({
      asset: opts.asset._toModern() as any,
      limit: opts.limit ? amountToBigInt(opts.limit) : undefined,
      source: opts.source,
    }));
  }

  static allowTrust(opts: OperationOpts & { trustor: string; assetCode: string; authorize: number }) {
    return wrap(modernAllowTrust({
      trustor: opts.trustor,
      assetCode: opts.assetCode,
      authorize: opts.authorize,
      source: opts.source,
    }));
  }

  static accountMerge(opts: OperationOpts & { destination: string }) {
    return wrap(modernAccountMerge({
      destination: opts.destination,
      source: opts.source,
    }));
  }

  static inflation(opts?: OperationOpts) {
    return wrap(modernInflation(opts));
  }

  static manageData(opts: OperationOpts & { name: string; value: Uint8Array | string | null }) {
    let valueBytes: Uint8Array | null = null;
    if (typeof opts.value === 'string') {
      valueBytes = new TextEncoder().encode(opts.value);
    } else {
      valueBytes = opts.value;
    }
    return wrap(modernManageData({
      name: opts.name,
      value: valueBytes,
      source: opts.source,
    }));
  }

  static bumpSequence(opts: OperationOpts & { bumpTo: string }) {
    return wrap(modernBumpSequence({
      bumpTo: BigInt(opts.bumpTo),
      source: opts.source,
    }));
  }

  static createClaimableBalance(opts: OperationOpts & { asset: Asset; amount: string; claimants: any[] }) {
    return wrap(modernCreateClaimableBalance({
      asset: opts.asset._toModern(),
      amount: amountToBigInt(opts.amount),
      claimants: opts.claimants.map((c: any) => c._toModern()),
      source: opts.source,
    }));
  }

  static claimClaimableBalance(opts: OperationOpts & { balanceId: string }) {
    // balanceId is hex-encoded — convert to proper structure
    const hashBytes = hexToBytes(opts.balanceId);
    return wrap(modernClaimClaimableBalance({
      balanceID: { ClaimableBalanceIdTypeV0: hashBytes },
      source: opts.source,
    }));
  }

  static beginSponsoringFutureReserves(opts: OperationOpts & { sponsoredId: string }) {
    return wrap(modernBeginSponsoringFutureReserves({
      sponsoredID: opts.sponsoredId,
      source: opts.source,
    }));
  }

  static endSponsoringFutureReserves(opts?: OperationOpts) {
    return wrap(modernEndSponsoringFutureReserves(opts));
  }

  static clawback(opts: OperationOpts & { asset: Asset; from: string; amount: string }) {
    return wrap(modernClawback({
      asset: opts.asset._toModern(),
      from: opts.from,
      amount: amountToBigInt(opts.amount),
      source: opts.source,
    }));
  }

  static clawbackClaimableBalance(opts: OperationOpts & { balanceId: string }) {
    const hashBytes = hexToBytes(opts.balanceId);
    return wrap(modernClawbackClaimableBalance({
      balanceID: { ClaimableBalanceIdTypeV0: hashBytes },
      source: opts.source,
    }));
  }

  static setTrustLineFlags(opts: OperationOpts & {
    trustor: string; asset: Asset; clearFlags: number; setFlags: number;
  }) {
    return wrap(modernSetTrustLineFlags({
      trustor: opts.trustor,
      asset: opts.asset._toModern(),
      clearFlags: opts.clearFlags,
      setFlags: opts.setFlags,
      source: opts.source,
    }));
  }

  static liquidityPoolDeposit(opts: OperationOpts & {
    liquidityPoolId: string; maxAmountA: string; maxAmountB: string;
    minPrice: string | { n: number; d: number }; maxPrice: string | { n: number; d: number };
  }) {
    return wrap(modernLiquidityPoolDeposit({
      liquidityPoolID: hexToBytes(opts.liquidityPoolId),
      maxAmountA: amountToBigInt(opts.maxAmountA),
      maxAmountB: amountToBigInt(opts.maxAmountB),
      minPrice: priceObj(opts.minPrice),
      maxPrice: priceObj(opts.maxPrice),
      source: opts.source,
    }));
  }

  static liquidityPoolWithdraw(opts: OperationOpts & {
    liquidityPoolId: string; amount: string; minAmountA: string; minAmountB: string;
  }) {
    return wrap(modernLiquidityPoolWithdraw({
      liquidityPoolID: hexToBytes(opts.liquidityPoolId),
      amount: amountToBigInt(opts.amount),
      minAmountA: amountToBigInt(opts.minAmountA),
      minAmountB: amountToBigInt(opts.minAmountB),
      source: opts.source,
    }));
  }

  static invokeHostFunction(opts: OperationOpts & { func: any; auth?: any[] }) {
    return wrap(modernInvokeHostFunction({
      hostFunction: opts.func,
      auth: opts.auth ?? [],
      source: opts.source,
    }));
  }

  static extendFootprintTtl(opts: OperationOpts & { extendTo: number }) {
    return wrap(modernExtendFootprintTtl({
      extendTo: opts.extendTo,
      source: opts.source,
    }));
  }

  static restoreFootprint(opts?: OperationOpts) {
    return wrap(modernRestoreFootprint(opts));
  }

  // Amount utilities
  static toStroops(amount: string): string {
    return toStroops(amount);
  }

  static fromStroops(stroops: string): string {
    return fromStroops(stroops);
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
