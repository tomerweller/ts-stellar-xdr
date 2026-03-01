/**
 * Operation class compatible with js-stellar-base.
 * Static factories that accept string amounts and return compat xdr.Operation instances.
 * Also exports a merged namespace with decoded operation interfaces (Operation.Payment, etc.).
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
import {
  Operation as CompatOperationXdr,
  ClaimPredicate as CompatClaimPredicate,
  HostFunction as CompatHostFunction,
  SorobanAuthorizationEntry as CompatSorobanAuthorizationEntry,
} from './generated/stellar_compat.js';
import {
  is,
  encodeStrkey,
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_MUXED_ED25519,
  STRKEY_CONTRACT,
  STRKEY_CLAIMABLE_BALANCE,
  STRKEY_LIQUIDITY_POOL,
  type Operation as ModernOperation,
  type MuxedAccount,
} from '@stellar/xdr';
import { Asset } from './asset.js';
import { Address } from './address.js';
import { LiquidityPoolAsset } from './liquidity-pool-asset.js';
import { LiquidityPoolId } from './liquidity-pool-id.js';
import { amountToBigInt, toStroops, fromStroops } from './amount.js';
import { augmentBuffersDeep, hash } from './signing.js';
import { StrKey } from './strkey.js';
import { SignerKey } from './signer-key.js';
import { Claimant } from './claimant.js';

function wrap(modernOp: any): any {
  return (CompatOperationXdr as any)._fromModern(modernOp);
}

// ---------------------------------------------------------------------------
// Validation helpers — match js-stellar-base error messages
// ---------------------------------------------------------------------------

function validateAddress(address: string | undefined, name: string): void {
  if (!address) throw new Error(`${name} is invalid`);
  if (StrKey.isValidEd25519PublicKey(address)) return;
  if (StrKey.isValidMed25519PublicKey(address)) return;
  throw new Error(`${name} is invalid`);
}

function validateAmount(value: any, name: string, allowZero = false): void {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} argument must be of type String, represent a positive number and have at most 7 digits after the decimal`);
  }
  try {
    const bi = amountToBigInt(value);
    if (allowZero ? bi < 0n : bi <= 0n) {
      throw new Error(`${name} argument must be of type String, represent a positive number and have at most 7 digits after the decimal`);
    }
  } catch (e: any) {
    if (e instanceof TypeError) throw e;
    throw new TypeError(`${name} argument must be of type String, represent a positive number and have at most 7 digits after the decimal`);
  }
}

function validateSource(source: string | undefined): void {
  if (source === undefined || source === null) return;
  if (StrKey.isValidEd25519PublicKey(source)) return;
  if (StrKey.isValidMed25519PublicKey(source)) return;
  throw new Error('Source address is invalid');
}

function coerceHexToBytes(val: any): Uint8Array {
  if (val instanceof Uint8Array) return val;
  if (typeof val === 'string') return hexToBytes(val);
  if (Array.isArray(val)) return new Uint8Array(val);
  return val;
}

/** Convert compat signer format to modern signer format */
function convertSigner(signer: any): { key: any; weight: number } | undefined {
  if (!signer) return undefined;
  const weight = signer.weight;
  if (signer.ed25519PublicKey) {
    const raw = StrKey.decodeEd25519PublicKey(signer.ed25519PublicKey);
    return { key: { Ed25519: raw }, weight };
  }
  if (signer.preAuthTx !== undefined) {
    const raw = coerceHexToBytes(signer.preAuthTx);
    return { key: { PreAuthTx: raw }, weight };
  }
  if (signer.sha256Hash !== undefined) {
    const raw = coerceHexToBytes(signer.sha256Hash);
    return { key: { HashX: raw }, weight };
  }
  if (signer.ed25519SignedPayload !== undefined) {
    // Decode the P-address to get the key + payload
    const decoded = SignerKey.decodeAddress(signer.ed25519SignedPayload);
    const modern = decoded._toModern ? decoded._toModern() : decoded;
    if (modern.Ed25519SignedPayload) {
      return { key: { Ed25519SignedPayload: modern.Ed25519SignedPayload }, weight };
    }
    return { key: modern, weight };
  }
  // Validate that exactly one key is specified
  const keyTypes = ['ed25519PublicKey', 'sha256Hash', 'preAuthTx', 'ed25519SignedPayload'];
  const keys = keyTypes.filter(k => signer[k] !== undefined);
  if (keys.length > 1) throw new Error('Signer object must contain exactly one of ed25519PublicKey, sha256Hash, preAuthTx.');
  if (keys.length === 0) throw new Error('Signer object must contain exactly one of ed25519PublicKey, sha256Hash, preAuthTx.');
  return undefined;
}

function priceObj(price: string | number | { n: number; d: number } | any, name: string = 'price'): { n: number; d: number } {
  if (price === undefined || price === null) {
    throw new Error(`${name} argument is required`);
  }
  if (typeof price === 'string' || typeof price === 'number') {
    const val = Number(price);
    if (isNaN(val)) {
      throw new Error(`price is not a number`);
    }
    if (!isFinite(val) || val <= 0) {
      throw new Error('price must be positive');
    }
    return approximatePrice(String(price));
  }
  // Handle BigNumber objects (have .numerator / .denominator)
  if (typeof price === 'object' && price.d !== undefined && price.n !== undefined) {
    if (price.n <= 0 || price.d <= 0) {
      throw new Error('price must be positive');
    }
    return price;
  }
  // Handle BigNumber/Fraction objects with numerator/denominator
  if (typeof price === 'object' && typeof price.toString === 'function') {
    const val = Number(price.toString());
    if (isNaN(val)) {
      throw new Error(`price is not a number`);
    }
    if (!isFinite(val) || val <= 0) {
      throw new Error('price must be positive');
    }
    return approximatePrice(price.toString());
  }
  throw new Error('price is not a number');
}

function priceToString(price: { n: number; d: number }): string {
  // Return decimal string (n/d as decimal)
  return (price.n / price.d).toString();
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

// ---------------------------------------------------------------------------
// Helper: decode MuxedAccount to string address
// ---------------------------------------------------------------------------

function muxedAccountToAddress(muxed: MuxedAccount): string {
  if (is(muxed, 'Ed25519')) {
    return encodeStrkey(STRKEY_ED25519_PUBLIC, muxed.Ed25519);
  }
  if (is(muxed, 'MuxedEd25519')) {
    const payload = new Uint8Array(40);
    payload.set(muxed.MuxedEd25519.ed25519, 0);
    const view = new DataView(payload.buffer);
    view.setBigUint64(32, muxed.MuxedEd25519.id, false);
    return encodeStrkey(STRKEY_MUXED_ED25519, payload);
  }
  throw new Error('Unknown muxed account type');
}

function accountIdToAddress(accountId: any): string {
  if (is(accountId, 'PublicKeyTypeEd25519')) {
    return encodeStrkey(STRKEY_ED25519_PUBLIC, accountId.PublicKeyTypeEd25519);
  }
  throw new Error('Unknown account ID type');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Operation.fromXDRObject — decode modern XDR operation to flat compat object
// ---------------------------------------------------------------------------

function decodeRevokeSponsorshipOp(revokeOp: any, source: string | undefined): any {
  if (is(revokeOp, 'LedgerEntry')) {
    const key = revokeOp.LedgerEntry;
    if (is(key, 'Account')) {
      return { type: 'revokeAccountSponsorship', account: accountIdToAddress(key.Account.accountID), source };
    }
    if (is(key, 'Trustline')) {
      const tl = key.Trustline;
      let asset: any;
      if (is(tl.asset, 'PoolShare')) {
        // TrustLineAsset with PoolShare arm contains a PoolHash (Uint8Array)
        const poolIdBytes = tl.asset.PoolShare;
        const hex = bytesToHex(poolIdBytes instanceof Uint8Array ? poolIdBytes : new Uint8Array(0));
        asset = new LiquidityPoolId(hex);
      } else {
        asset = Asset._fromModern(tl.asset);
      }
      return { type: 'revokeTrustlineSponsorship', account: accountIdToAddress(tl.accountID), asset, source };
    }
    if (is(key, 'Offer')) {
      const o = key.Offer;
      return { type: 'revokeOfferSponsorship', seller: accountIdToAddress(o.sellerID), offerId: o.offerID.toString(), source };
    }
    if (is(key, 'Data')) {
      const d = key.Data;
      return { type: 'revokeDataSponsorship', account: accountIdToAddress(d.accountID), name: d.dataName, source };
    }
    if (is(key, 'ClaimableBalance')) {
      const cb = key.ClaimableBalance;
      // balanceID is { ClaimableBalanceIdTypeV0: Uint8Array }
      const hash = is(cb.balanceID, 'ClaimableBalanceIdTypeV0') ? cb.balanceID.ClaimableBalanceIdTypeV0 : cb.balanceID;
      const hashHex = Array.from(hash instanceof Uint8Array ? hash : new Uint8Array(0), (b: number) => b.toString(16).padStart(2, '0')).join('');
      // Prepend type prefix (00000000 for ClaimableBalanceIdTypeV0)
      const hex = '00000000' + hashHex;
      return { type: 'revokeClaimableBalanceSponsorship', balanceId: hex, source };
    }
    if (is(key, 'LiquidityPool')) {
      const poolId = key.LiquidityPool.liquidityPoolID;
      const hex = Array.from(poolId instanceof Uint8Array ? poolId : new Uint8Array(0), (b: number) => b.toString(16).padStart(2, '0')).join('');
      return { type: 'revokeLiquidityPoolSponsorship', liquidityPoolId: hex, source };
    }
  }
  if (is(revokeOp, 'Signer')) {
    const s = revokeOp.Signer;
    const key = s.signerKey;
    let signer: any = {};
    if (is(key, 'Ed25519')) {
      signer.ed25519PublicKey = encodeStrkey(STRKEY_ED25519_PUBLIC, key.Ed25519);
    } else if (is(key, 'PreAuthTx')) {
      signer.preAuthTx = bytesToHex(key.PreAuthTx);
    } else if (is(key, 'HashX')) {
      signer.sha256Hash = bytesToHex(key.HashX);
    } else if (is(key, 'Ed25519SignedPayload')) {
      signer.ed25519SignedPayload = SignerKey.encodeSignerKey(key);
    } else {
      signer = { ...key };
    }
    return {
      type: 'revokeSignerSponsorship',
      account: accountIdToAddress(s.accountID),
      signer,
      source,
    };
  }
  return { type: 'revokeSponsorship', ...revokeOp, source };
}

function decodeOperation(op: ModernOperation): any {
  const body = op.body;
  const source = op.sourceAccount ? muxedAccountToAddress(op.sourceAccount) : undefined;

  // Void arms
  if (body === 'Inflation') {
    return { type: 'inflation', source };
  }
  if (body === 'EndSponsoringFutureReserves') {
    return { type: 'endSponsoringFutureReserves', source };
  }

  // Value arms
  if (is(body, 'CreateAccount')) {
    const op_ = body.CreateAccount;
    return {
      type: 'createAccount',
      destination: accountIdToAddress(op_.destination),
      startingBalance: fromStroops(op_.startingBalance.toString()),
      source,
    };
  }

  if (is(body, 'Payment')) {
    const op_ = body.Payment;
    return {
      type: 'payment',
      destination: muxedAccountToAddress(op_.destination),
      asset: Asset._fromModern(op_.asset),
      amount: fromStroops(op_.amount.toString()),
      source,
    };
  }

  if (is(body, 'PathPaymentStrictReceive')) {
    const op_ = body.PathPaymentStrictReceive;
    return {
      type: 'pathPaymentStrictReceive',
      sendAsset: Asset._fromModern(op_.sendAsset),
      sendMax: fromStroops(op_.sendMax.toString()),
      destination: muxedAccountToAddress(op_.destination),
      destAsset: Asset._fromModern(op_.destAsset),
      destAmount: fromStroops(op_.destAmount.toString()),
      path: op_.path.map((a: any) => Asset._fromModern(a)),
      source,
    };
  }

  if (is(body, 'PathPaymentStrictSend')) {
    const op_ = body.PathPaymentStrictSend;
    return {
      type: 'pathPaymentStrictSend',
      sendAsset: Asset._fromModern(op_.sendAsset),
      sendAmount: fromStroops(op_.sendAmount.toString()),
      destination: muxedAccountToAddress(op_.destination),
      destAsset: Asset._fromModern(op_.destAsset),
      destMin: fromStroops(op_.destMin.toString()),
      path: op_.path.map((a: any) => Asset._fromModern(a)),
      source,
    };
  }

  if (is(body, 'ManageSellOffer')) {
    const op_ = body.ManageSellOffer;
    return {
      type: 'manageSellOffer',
      selling: Asset._fromModern(op_.selling),
      buying: Asset._fromModern(op_.buying),
      amount: fromStroops(op_.amount.toString()),
      price: priceToString(op_.price),
      offerId: op_.offerID.toString(),
      source,
    };
  }

  if (is(body, 'ManageBuyOffer')) {
    const op_ = body.ManageBuyOffer;
    return {
      type: 'manageBuyOffer',
      selling: Asset._fromModern(op_.selling),
      buying: Asset._fromModern(op_.buying),
      buyAmount: fromStroops(op_.buyAmount.toString()),
      price: priceToString(op_.price),
      offerId: op_.offerID.toString(),
      source,
    };
  }

  if (is(body, 'CreatePassiveSellOffer')) {
    const op_ = body.CreatePassiveSellOffer;
    return {
      type: 'createPassiveSellOffer',
      selling: Asset._fromModern(op_.selling),
      buying: Asset._fromModern(op_.buying),
      amount: fromStroops(op_.amount.toString()),
      price: priceToString(op_.price),
      source,
    };
  }

  if (is(body, 'SetOptions')) {
    const op_ = body.SetOptions;
    const result: any = { type: 'setOptions', source };
    if (op_.inflationDest !== null) result.inflationDest = accountIdToAddress(op_.inflationDest);
    if (op_.clearFlags !== null) result.clearFlags = op_.clearFlags;
    if (op_.setFlags !== null) result.setFlags = op_.setFlags;
    if (op_.masterWeight !== null) result.masterWeight = op_.masterWeight;
    if (op_.lowThreshold !== null) result.lowThreshold = op_.lowThreshold;
    if (op_.medThreshold !== null) result.medThreshold = op_.medThreshold;
    if (op_.highThreshold !== null) result.highThreshold = op_.highThreshold;
    if (op_.homeDomain !== null) result.homeDomain = op_.homeDomain;
    if (op_.signer !== null) {
      const key = op_.signer.key;
      const weight = op_.signer.weight;
      const signer: any = { weight };
      if (is(key, 'Ed25519')) {
        signer.ed25519PublicKey = encodeStrkey(STRKEY_ED25519_PUBLIC, key.Ed25519);
      } else if (is(key, 'PreAuthTx')) {
        signer.preAuthTx = key.PreAuthTx;
      } else if (is(key, 'HashX')) {
        signer.sha256Hash = key.HashX;
      } else if (is(key, 'Ed25519SignedPayload')) {
        signer.ed25519SignedPayload = SignerKey.encodeSignerKey(key);
      }
      result.signer = signer;
    }
    return result;
  }

  if (is(body, 'ChangeTrust')) {
    const op_ = body.ChangeTrust;
    let line: any;
    if (is(op_.line, 'PoolShare')) {
      // Decode PoolShare into LiquidityPoolAsset
      const poolParams = (op_.line as any).PoolShare;
      const cpParams = is(poolParams, 'LiquidityPoolConstantProduct') ? poolParams.LiquidityPoolConstantProduct : poolParams;
      const assetA = Asset._fromModern(cpParams.assetA);
      const assetB = Asset._fromModern(cpParams.assetB);
      line = new LiquidityPoolAsset(assetA, assetB, cpParams.fee);
    } else {
      line = Asset._fromModern(op_.line as any);
    }
    return {
      type: 'changeTrust',
      line,
      limit: fromStroops(op_.limit.toString()),
      source,
    };
  }

  if (is(body, 'AllowTrust')) {
    const op_ = body.AllowTrust;
    const rawAsset = op_.asset;
    let assetCode: string;
    if (is(rawAsset, 'CreditAlphanum4')) {
      assetCode = new TextDecoder().decode(rawAsset.CreditAlphanum4).replace(/\0+$/, '');
    } else if (is(rawAsset, 'CreditAlphanum12')) {
      assetCode = new TextDecoder().decode(rawAsset.CreditAlphanum12).replace(/\0+$/, '');
    } else {
      assetCode = String(rawAsset);
    }
    return {
      type: 'allowTrust',
      trustor: accountIdToAddress(op_.trustor),
      assetCode,
      authorize: op_.authorize,
      source,
    };
  }

  if (is(body, 'AccountMerge')) {
    return {
      type: 'accountMerge',
      destination: muxedAccountToAddress(body.AccountMerge),
      source,
    };
  }

  if (is(body, 'ManageData')) {
    const op_ = body.ManageData;
    return {
      type: 'manageData',
      name: op_.dataName,
      value: op_.dataValue ?? undefined,
      source,
    };
  }

  if (is(body, 'BumpSequence')) {
    const op_ = body.BumpSequence;
    return {
      type: 'bumpSequence',
      bumpTo: op_.bumpTo.toString(),
      source,
    };
  }

  if (is(body, 'CreateClaimableBalance')) {
    const op_ = body.CreateClaimableBalance;
    return {
      type: 'createClaimableBalance',
      asset: Asset._fromModern(op_.asset),
      amount: fromStroops(op_.amount.toString()),
      claimants: op_.claimants.map((c: any) => {
        if (is(c, 'ClaimantTypeV0')) {
          const v0 = c.ClaimantTypeV0;
          const dest = accountIdToAddress(v0.destination);
          return new Claimant(dest, (CompatClaimPredicate as any)._fromModern(v0.predicate));
        }
        return c;
      }),
      source,
    };
  }

  if (is(body, 'ClaimClaimableBalance')) {
    const op_ = body.ClaimClaimableBalance;
    // balanceID is { ClaimableBalanceIdTypeV0: Uint8Array } — encode as 72-char hex with type prefix
    const hash = is(op_.balanceID, 'ClaimableBalanceIdTypeV0') ? op_.balanceID.ClaimableBalanceIdTypeV0 : op_.balanceID;
    const hex = '00000000' + bytesToHex(hash instanceof Uint8Array ? hash : new Uint8Array(0));
    return {
      type: 'claimClaimableBalance',
      balanceId: hex,
      source,
    };
  }

  if (is(body, 'BeginSponsoringFutureReserves')) {
    const op_ = body.BeginSponsoringFutureReserves;
    return {
      type: 'beginSponsoringFutureReserves',
      sponsoredId: accountIdToAddress(op_.sponsoredID),
      source,
    };
  }

  if (is(body, 'RevokeSponsorship')) {
    return decodeRevokeSponsorshipOp(body.RevokeSponsorship, source);
  }

  if (is(body, 'Clawback')) {
    const op_ = body.Clawback;
    return {
      type: 'clawback',
      asset: Asset._fromModern(op_.asset),
      from: muxedAccountToAddress(op_.from),
      amount: fromStroops(op_.amount.toString()),
      source,
    };
  }

  if (is(body, 'ClawbackClaimableBalance')) {
    const op_ = body.ClawbackClaimableBalance;
    // balanceID is { ClaimableBalanceIdTypeV0: Uint8Array } — encode as 72-char hex with type prefix
    const hash = is(op_.balanceID, 'ClaimableBalanceIdTypeV0') ? op_.balanceID.ClaimableBalanceIdTypeV0 : op_.balanceID;
    const hex = '00000000' + bytesToHex(hash instanceof Uint8Array ? hash : new Uint8Array(0));
    return {
      type: 'clawbackClaimableBalance',
      balanceId: hex,
      source,
    };
  }

  if (is(body, 'SetTrustLineFlags')) {
    const op_ = body.SetTrustLineFlags;
    // Decode clearFlags/setFlags into named flags object
    const clearFlagsNum = op_.clearFlags;
    const setFlagsNum = op_.setFlags;
    const flags: any = {};
    // authorized = bit 1
    if (setFlagsNum & 1) flags.authorized = true;
    else if (clearFlagsNum & 1) flags.authorized = false;
    // authorizedToMaintainLiabilities = bit 2
    if (setFlagsNum & 2) flags.authorizedToMaintainLiabilities = true;
    else if (clearFlagsNum & 2) flags.authorizedToMaintainLiabilities = false;
    // clawbackEnabled = bit 4
    if (setFlagsNum & 4) flags.clawbackEnabled = true;
    else if (clearFlagsNum & 4) flags.clawbackEnabled = false;
    return {
      type: 'setTrustLineFlags',
      trustor: accountIdToAddress(op_.trustor),
      asset: Asset._fromModern(op_.asset),
      flags,
      source,
    };
  }

  if (is(body, 'LiquidityPoolDeposit')) {
    const op_ = body.LiquidityPoolDeposit;
    return {
      type: 'liquidityPoolDeposit',
      liquidityPoolId: bytesToHex(op_.liquidityPoolID),
      maxAmountA: fromStroops(op_.maxAmountA.toString()),
      maxAmountB: fromStroops(op_.maxAmountB.toString()),
      minPrice: priceToString(op_.minPrice),
      maxPrice: priceToString(op_.maxPrice),
      source,
    };
  }

  if (is(body, 'LiquidityPoolWithdraw')) {
    const op_ = body.LiquidityPoolWithdraw;
    return {
      type: 'liquidityPoolWithdraw',
      liquidityPoolId: bytesToHex(op_.liquidityPoolID),
      amount: fromStroops(op_.amount.toString()),
      minAmountA: fromStroops(op_.minAmountA.toString()),
      minAmountB: fromStroops(op_.minAmountB.toString()),
      source,
    };
  }

  if (is(body, 'InvokeHostFunction')) {
    const op_ = body.InvokeHostFunction;
    // Convert modern hostFunction and auth to compat objects so tests get .switch()/.invokeContract() etc.
    const compatFunc = (CompatHostFunction as any)._fromModern(op_.hostFunction);
    const compatAuth = op_.auth.map((a: any) => (CompatSorobanAuthorizationEntry as any)._fromModern(a));
    return {
      type: 'invokeHostFunction',
      func: compatFunc,
      auth: compatAuth,
      source,
    };
  }

  if (is(body, 'ExtendFootprintTtl')) {
    const op_ = body.ExtendFootprintTtl;
    return {
      type: 'extendFootprintTtl',
      extendTo: op_.extendTo,
      source,
    };
  }

  if (is(body, 'RestoreFootprint')) {
    return {
      type: 'restoreFootprint',
      source,
    };
  }

  // Fallback: return the raw body with type unknown
  return { type: 'unknown', body, source };
}

// ---------------------------------------------------------------------------
// Operation — static factories (class is internal, exported as value + type)
// ---------------------------------------------------------------------------

class OperationStatic {
  static createAccount(opts: OperationOpts & { destination: string; startingBalance: string }) {
    validateAddress(opts.destination, 'destination');
    validateAmount(opts.startingBalance, 'startingBalance', true);
    validateSource(opts.source);
    return wrap(modernCreateAccount({
      destination: opts.destination,
      startingBalance: amountToBigInt(opts.startingBalance),
      source: opts.source,
    }));
  }

  static payment(opts: OperationOpts & { destination: string; asset: Asset; amount: string }) {
    validateAddress(opts.destination, 'destination');
    validateAmount(opts.amount, 'amount');
    validateSource(opts.source);
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
    validateAmount(opts.sendMax, 'sendMax');
    validateAmount(opts.destAmount, 'destAmount');
    validateAddress(opts.destination, 'destination');
    validateSource(opts.source);
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
    validateAddress(opts.destination, 'destination');
    validateAmount(opts.sendAmount, 'sendAmount');
    validateAmount(opts.destMin, 'destMin');
    validateSource(opts.source);
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
    validateAmount(opts.amount, 'amount', true);
    validateSource(opts.source);
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
    validateAmount(opts.buyAmount, 'buyAmount', true);
    validateSource(opts.source);
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
    validateAmount(opts.amount, 'amount');
    validateSource(opts.source);
    return wrap(modernCreatePassiveSellOffer({
      selling: opts.selling._toModern(),
      buying: opts.buying._toModern(),
      amount: amountToBigInt(opts.amount),
      price: priceObj(opts.price),
      source: opts.source,
    }));
  }

  static setOptions(opts: OperationOpts & {
    inflationDest?: string; clearFlags?: number | string; setFlags?: number | string;
    masterWeight?: number; lowThreshold?: number; medThreshold?: number;
    highThreshold?: number; homeDomain?: string; signer?: any;
  }) {
    if (opts.inflationDest !== undefined) {
      if (!StrKey.isValidEd25519PublicKey(opts.inflationDest)) {
        throw new Error('inflationDest is invalid');
      }
    }
    if (opts.signer) {
      // Validate signer has exactly one key
      const keyTypes = ['ed25519PublicKey', 'sha256Hash', 'preAuthTx', 'ed25519SignedPayload'];
      const keys = keyTypes.filter(k => opts.signer[k] !== undefined);
      if (keys.length !== 1) {
        throw new Error('Signer object must contain exactly one of ed25519PublicKey, sha256Hash, preAuthTx.');
      }
      if (opts.signer.ed25519PublicKey && !StrKey.isValidEd25519PublicKey(opts.signer.ed25519PublicKey)) {
        throw new Error('signer.ed25519PublicKey is invalid');
      }
    }
    // Coerce string flags to numbers
    const clearFlags = opts.clearFlags !== undefined ? Number(opts.clearFlags) : undefined;
    const setFlags = opts.setFlags !== undefined ? Number(opts.setFlags) : undefined;
    if (clearFlags !== undefined && (!Number.isFinite(clearFlags) || clearFlags < 0 || clearFlags > 7)) {
      throw new Error('clearFlags is invalid');
    }
    if (setFlags !== undefined && (!Number.isFinite(setFlags) || setFlags < 0 || setFlags > 15)) {
      throw new Error('setFlags is invalid');
    }
    if (opts.masterWeight !== undefined) {
      const mw = Number(opts.masterWeight);
      if (!Number.isInteger(mw) || mw < 0 || mw > 255) throw new Error('masterWeight value must be between 0 and 255');
    }
    if (opts.lowThreshold !== undefined) {
      const lt = Number(opts.lowThreshold);
      if (!Number.isInteger(lt) || lt < 0 || lt > 255) throw new Error('lowThreshold value must be between 0 and 255');
    }
    if (opts.medThreshold !== undefined) {
      const mt = Number(opts.medThreshold);
      if (!Number.isInteger(mt) || mt < 0 || mt > 255) throw new Error('medThreshold value must be between 0 and 255');
    }
    if (opts.highThreshold !== undefined) {
      const ht = Number(opts.highThreshold);
      if (!Number.isInteger(ht) || ht < 0 || ht > 255) throw new Error('highThreshold value must be between 0 and 255');
    }
    if (opts.homeDomain !== undefined && typeof opts.homeDomain !== 'string') {
      throw new TypeError('homeDomain argument must be of type String');
    }
    validateSource(opts.source);

    const modernSigner = opts.signer ? convertSigner(opts.signer) : undefined;
    return wrap(modernSetOptions({
      inflationDest: opts.inflationDest,
      clearFlags,
      setFlags,
      masterWeight: opts.masterWeight,
      lowThreshold: opts.lowThreshold,
      medThreshold: opts.medThreshold,
      highThreshold: opts.highThreshold,
      homeDomain: opts.homeDomain,
      signer: modernSigner,
      source: opts.source,
    }));
  }

  static changeTrust(opts: OperationOpts & { asset: any; limit?: string }) {
    if (opts.limit !== undefined && typeof opts.limit !== 'string') {
      throw new TypeError('limit argument must be of type String');
    }
    validateSource(opts.source);
    // Support LiquidityPoolAsset (has getLiquidityPoolParameters method)
    let modernAsset: any;
    if (opts.asset instanceof LiquidityPoolAsset || (opts.asset && typeof opts.asset.getLiquidityPoolParameters === 'function')) {
      const params = opts.asset.getLiquidityPoolParameters();
      modernAsset = {
        PoolShare: {
          LiquidityPoolConstantProduct: {
            assetA: params.assetA._toModern(),
            assetB: params.assetB._toModern(),
            fee: params.fee,
          },
        },
      };
    } else if (opts.asset && typeof opts.asset._toModern === 'function') {
      modernAsset = opts.asset._toModern();
    } else {
      modernAsset = opts.asset;
    }
    return wrap(modernChangeTrust({
      asset: modernAsset as any,
      limit: opts.limit ? amountToBigInt(opts.limit) : undefined,
      source: opts.source,
    }));
  }

  static allowTrust(opts: OperationOpts & { trustor: string; assetCode: string; authorize: any }) {
    if (!StrKey.isValidEd25519PublicKey(opts.trustor)) {
      throw new Error('trustor is invalid');
    }
    validateSource(opts.source);
    // Coerce boolean authorize to number
    let authorize = opts.authorize;
    if (typeof authorize === 'boolean') {
      authorize = authorize ? 1 : 0;
    }
    return wrap(modernAllowTrust({
      trustor: opts.trustor,
      assetCode: opts.assetCode,
      authorize,
      source: opts.source,
    }));
  }

  static accountMerge(opts: OperationOpts & { destination: string }) {
    validateAddress(opts.destination, 'destination');
    validateSource(opts.source);
    return wrap(modernAccountMerge({
      destination: opts.destination,
      source: opts.source,
    }));
  }

  static inflation(opts?: OperationOpts) {
    if (opts) validateSource(opts.source);
    return wrap(modernInflation(opts));
  }

  static manageData(opts: OperationOpts & { name: any; value: Uint8Array | string | null }) {
    if (typeof opts.name !== 'string') throw new Error('"name" must be a string, up to 64 characters');
    if (opts.name.length > 64) throw new Error('"name" must be a string, up to 64 characters');
    validateSource(opts.source);
    let valueBytes: Uint8Array | null = null;
    if (typeof opts.value === 'string') {
      valueBytes = new TextEncoder().encode(opts.value);
    } else if (opts.value instanceof Uint8Array) {
      valueBytes = opts.value.constructor === Uint8Array ? opts.value : new Uint8Array(opts.value);
    } else {
      valueBytes = opts.value;
    }
    if (valueBytes !== null && valueBytes.length > 64) {
      throw new Error('"value" argument must be <= 64 bytes');
    }
    return wrap(modernManageData({
      name: opts.name,
      value: valueBytes,
      source: opts.source,
    }));
  }

  static bumpSequence(opts: OperationOpts & { bumpTo: any }) {
    if (typeof opts.bumpTo !== 'string') throw new TypeError('bumpTo must be a string');
    validateSource(opts.source);
    return wrap(modernBumpSequence({
      bumpTo: BigInt(opts.bumpTo),
      source: opts.source,
    }));
  }

  static createClaimableBalance(opts: OperationOpts & { asset: any; amount: string; claimants: any[] }) {
    if (!opts.asset) throw new Error('must provide an asset for create claimable balance operation');
    if (!opts.claimants || !opts.claimants.length) throw new Error('must provide at least one claimant');
    validateAmount(opts.amount, 'amount');
    validateSource(opts.source);
    return wrap(modernCreateClaimableBalance({
      asset: opts.asset._toModern(),
      amount: amountToBigInt(opts.amount),
      claimants: opts.claimants.map((c: any) => c._toModern()),
      source: opts.source,
    }));
  }

  static claimClaimableBalance(opts: OperationOpts & { balanceId: string }) {
    if (!opts.balanceId) throw new Error('must provide a valid claimable balance id');
    if (typeof opts.balanceId !== 'string' || opts.balanceId.length !== 72) throw new Error('must provide a valid claimable balance id');
    validateSource(opts.source);
    // The balanceId is a 72-char hex: 8-char type prefix (00000000) + 64-char hash
    // Strip the 8-char prefix to get the 32-byte hash
    const hashHex = opts.balanceId.slice(8);
    const hashBytes = hexToBytes(hashHex);
    return wrap(modernClaimClaimableBalance({
      balanceID: { ClaimableBalanceIdTypeV0: hashBytes },
      source: opts.source,
    }));
  }

  static beginSponsoringFutureReserves(opts: OperationOpts & { sponsoredId: string }) {
    validateAddress(opts.sponsoredId, 'sponsoredId');
    validateSource(opts.source);
    return wrap(modernBeginSponsoringFutureReserves({
      sponsoredID: opts.sponsoredId,
      source: opts.source,
    }));
  }

  static endSponsoringFutureReserves(opts?: OperationOpts) {
    if (opts) validateSource(opts.source);
    return wrap(modernEndSponsoringFutureReserves(opts));
  }

  static clawback(opts: OperationOpts & { asset: Asset; from: string; amount: string }) {
    validateAmount(opts.amount, 'amount');
    validateSource(opts.source);
    return wrap(modernClawback({
      asset: opts.asset._toModern(),
      from: opts.from,
      amount: amountToBigInt(opts.amount),
      source: opts.source,
    }));
  }

  static clawbackClaimableBalance(opts: OperationOpts & { balanceId: string }) {
    if (!opts.balanceId) throw new Error('must provide a valid claimable balance id');
    if (typeof opts.balanceId !== 'string' || opts.balanceId.length !== 72) throw new Error('must provide a valid claimable balance id');
    validateSource(opts.source);
    // The balanceId is a 72-char hex: 8-char type prefix (00000000) + 64-char hash
    // Strip the 8-char prefix to get the 32-byte hash
    const hashHex = opts.balanceId.slice(8);
    const hashBytes = hexToBytes(hashHex);
    return wrap(modernClawbackClaimableBalance({
      balanceID: { ClaimableBalanceIdTypeV0: hashBytes },
      source: opts.source,
    }));
  }

  static setTrustLineFlags(opts: OperationOpts & {
    trustor?: string; asset?: Asset; flags?: any; clearFlags?: number; setFlags?: number;
  }) {
    if (!opts.trustor || !StrKey.isValidEd25519PublicKey(opts.trustor)) {
      throw new Error('trustor is invalid');
    }
    if (!opts.asset) {
      throw new Error('asset is required');
    }
    validateSource(opts.source);

    let clearFlags = opts.clearFlags ?? 0;
    let setFlags = opts.setFlags ?? 0;

    if (opts.flags === undefined && opts.clearFlags === undefined && opts.setFlags === undefined) {
      throw new Error('flags argument is required');
    }

    if (opts.flags !== undefined) {
      if (!opts.flags || typeof opts.flags !== 'object' || Array.isArray(opts.flags)) {
        throw new Error('flags must be a valid flags object');
      }
      // Validate flag names
      const validFlags = ['authorized', 'authorizedToMaintainLiabilities', 'clawbackEnabled'];
      for (const key of Object.keys(opts.flags)) {
        if (!validFlags.includes(key)) {
          throw new Error(`invalid flag name: ${key}`);
        }
      }
      // Flag bit values:
      //   authorized = 1
      //   authorizedToMaintainLiabilities = 2
      //   clawbackEnabled = 4
      const flagBits: Record<string, number> = {
        authorized: 1,
        authorizedToMaintainLiabilities: 2,
        clawbackEnabled: 4,
      };
      clearFlags = 0;
      setFlags = 0;
      for (const [name, bit] of Object.entries(flagBits)) {
        if (opts.flags[name] === true) {
          setFlags |= bit;
        } else if (opts.flags[name] === false) {
          clearFlags |= bit;
        }
        // undefined means leave unchanged — don't set or clear
      }
    }

    return wrap(modernSetTrustLineFlags({
      trustor: opts.trustor,
      asset: opts.asset._toModern(),
      clearFlags,
      setFlags,
      source: opts.source,
    }));
  }

  static liquidityPoolDeposit(opts: OperationOpts & {
    liquidityPoolId: string; maxAmountA: string; maxAmountB: string;
    minPrice: string | { n: number; d: number }; maxPrice: string | { n: number; d: number };
  }) {
    if (!opts || !opts.liquidityPoolId) throw new Error('liquidityPoolId argument is required');
    validateAmount(opts.maxAmountA, 'maxAmountA');
    validateAmount(opts.maxAmountB, 'maxAmountB');
    validateSource(opts.source);
    return wrap(modernLiquidityPoolDeposit({
      liquidityPoolID: hexToBytes(opts.liquidityPoolId),
      maxAmountA: amountToBigInt(opts.maxAmountA),
      maxAmountB: amountToBigInt(opts.maxAmountB),
      minPrice: priceObj(opts.minPrice, 'minPrice'),
      maxPrice: priceObj(opts.maxPrice, 'maxPrice'),
      source: opts.source,
    }));
  }

  static liquidityPoolWithdraw(opts: OperationOpts & {
    liquidityPoolId: string; amount: string; minAmountA: string; minAmountB: string;
  }) {
    if (!opts || !opts.liquidityPoolId) throw new Error('liquidityPoolId argument is required');
    validateAmount(opts.amount, 'amount');
    validateAmount(opts.minAmountA, 'minAmountA', true);
    validateAmount(opts.minAmountB, 'minAmountB', true);
    validateSource(opts.source);
    return wrap(modernLiquidityPoolWithdraw({
      liquidityPoolID: hexToBytes(opts.liquidityPoolId),
      amount: amountToBigInt(opts.amount),
      minAmountA: amountToBigInt(opts.minAmountA),
      minAmountB: amountToBigInt(opts.minAmountB),
      source: opts.source,
    }));
  }

  static invokeHostFunction(opts: OperationOpts & { func: any; auth?: any[] }) {
    if (!opts.func) {
      throw new TypeError(
        `host function invocation ('func') required (got ${JSON.stringify(opts)})`
      );
    }
    validateSource(opts.source);

    // Validate: reject claimable balance / liquidity pool addresses in invoke args
    const funcObj = opts.func;
    const switchVal = typeof funcObj.switch === 'function' ? funcObj.switch() : null;
    if (switchVal && (switchVal.name === 'hostFunctionTypeInvokeContract' || switchVal.value === 0)) {
      const invokeArgs = typeof funcObj.invokeContract === 'function' ? funcObj.invokeContract() : null;
      const args = invokeArgs && typeof invokeArgs.args === 'function' ? invokeArgs.args() : [];
      for (const arg of args) {
        try {
          const addr = Address.fromScVal(arg);
          // Check if the address is a claimable balance or liquidity pool
          const decoded = decodeStrkey(addr.toString());
          if (decoded.version === STRKEY_CLAIMABLE_BALANCE || decoded.version === STRKEY_LIQUIDITY_POOL) {
            throw new TypeError(
              `claimable balances and liquidity pools cannot be arguments to invokeHostFunction`
            );
          }
        } catch (e) {
          // Re-throw our own TypeError, swallow non-Address errors
          if (e instanceof TypeError && (e as any).message.includes('liquidity pool')) throw e;
        }
      }
    }

    // Convert compat HostFunction/auth to modern format if needed
    const hostFunction = opts.func && typeof opts.func._toModern === 'function'
      ? opts.func._toModern()
      : opts.func;
    const auth = (opts.auth ?? []).map((a: any) =>
      a && typeof a._toModern === 'function' ? a._toModern() : a
    );
    return wrap(modernInvokeHostFunction({
      hostFunction,
      auth,
      source: opts.source,
    }));
  }

  static extendFootprintTtl(opts: OperationOpts & { extendTo: number }) {
    if (!opts.extendTo || opts.extendTo <= 0) {
      throw new Error('"extendTo" value has to be positive');
    }
    validateSource(opts.source);
    return wrap(modernExtendFootprintTtl({
      extendTo: opts.extendTo,
      source: opts.source,
    }));
  }

  static restoreFootprint(opts?: OperationOpts) {
    if (opts) validateSource(opts.source);
    return wrap(modernRestoreFootprint(opts));
  }

  // Soroban convenience operations

  /**
   * Create a Stellar Asset Contract (SAC) for a classic asset.
   */
  static createStellarAssetContract(opts: OperationOpts & { asset: any; auth?: any[] }) {
    let asset = opts.asset;
    if (typeof asset === 'string') {
      const parts = asset.split(':');
      asset = new Asset(parts[0]!, parts[1]);
    }
    if (!(asset instanceof Asset)) {
      throw new TypeError(`expected Asset in 'opts.asset', got ${asset}`);
    }
    const hostFunction: any = {
      CreateContract: {
        contractIDPreimage: {
          Asset: asset._toModern(),
        },
        executable: 'StellarAsset',
      },
    };
    return wrap(modernInvokeHostFunction({
      hostFunction,
      auth: opts.auth ?? [],
      source: opts.source,
    }));
  }

  /**
   * Invoke a specific contract function (convenience wrapper).
   */
  static invokeContractFunction(opts: OperationOpts & {
    contract: string; function: string; args: any[]; auth?: any[];
  }) {
    const c = new Address(opts.contract);
    // Build a compat HostFunction via _fromModern, converting args to modern first
    const modernArgs = (opts.args || []).map((a: any) =>
      a && typeof a._toModern === 'function' ? a._toModern() : a
    );
    const modernHostFunc = {
      InvokeContract: {
        contractAddress: c.toScAddress()._toModern(),
        functionName: opts.function,
        args: modernArgs,
      },
    };
    const compatFunc = (CompatHostFunction as any)._fromModern(modernHostFunc);
    return OperationStatic.invokeHostFunction({
      func: compatFunc,
      auth: opts.auth,
      source: opts.source,
    });
  }

  /**
   * Create a custom Soroban contract from a WASM hash.
   */
  static createCustomContract(opts: OperationOpts & {
    address: any; wasmHash: Uint8Array; constructorArgs?: any[]; salt?: Uint8Array; auth?: any[];
  }) {
    const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(32));
    let address: any;
    if (typeof opts.address === 'string') {
      const { version, payload } = decodeStrkey(opts.address);
      if (version === STRKEY_CONTRACT) {
        address = { Contract: payload };
      } else {
        address = { Account: { PublicKeyTypeEd25519: payload } };
      }
    } else if (opts.address instanceof Address) {
      // Address object - convert to modern ScAddress
      address = opts.address.toScAddress()._toModern();
    } else if (typeof opts.address?.toScAddress === 'function') {
      // Compat Address-like object
      address = opts.address.toScAddress()._toModern();
    } else {
      address = opts.address;
    }
    // Convert compat constructorArgs to modern
    const constructorArgs = (opts.constructorArgs ?? []).map((a: any) =>
      a && typeof a._toModern === 'function' ? a._toModern() : a
    );
    const hostFunction: any = {
      CreateContractV2: {
        contractIDPreimage: {
          Address: { address, salt },
        },
        executable: { Wasm: opts.wasmHash },
        constructorArgs,
      },
    };
    return wrap(modernInvokeHostFunction({
      hostFunction,
      auth: opts.auth ?? [],
      source: opts.source,
    }));
  }

  /**
   * Upload WASM bytecode to the network.
   */
  static uploadContractWasm(opts: OperationOpts & { wasm: Uint8Array }) {
    const hostFunction: any = { UploadContractWasm: opts.wasm };
    return wrap(modernInvokeHostFunction({
      hostFunction,
      auth: [],
      source: opts.source,
    }));
  }

  // Revoke sponsorship operations
  static revokeAccountSponsorship(opts: OperationOpts & { account: string }) {
    validateAddress(opts.account, 'account');
    validateSource(opts.source);
    const pubkey = { PublicKeyTypeEd25519: StrKey.decodeEd25519PublicKey(opts.account) };
    const modern: any = {
      body: {
        RevokeSponsorship: {
          LedgerEntry: { Account: { accountID: pubkey } },
        },
      },
      sourceAccount: opts.source ? parseSource(opts.source) : null,
    };
    return wrap(modern);
  }

  static revokeTrustlineSponsorship(opts: OperationOpts & { account: string; asset: any }) {
    validateAddress(opts.account, 'account');
    if (!opts.asset) throw new Error('asset must be an Asset or LiquidityPoolId');
    validateSource(opts.source);
    const pubkey = { PublicKeyTypeEd25519: StrKey.decodeEd25519PublicKey(opts.account) };
    let trustLineAsset: any;
    if (typeof opts.asset?._toModern === 'function') {
      // Asset or LiquidityPoolAsset
      const modern = opts.asset._toModern();
      // Convert Asset to TrustLineAsset (same structure but different union names)
      if (modern === 'Native') {
        trustLineAsset = 'Native';
      } else if (modern?.CreditAlphanum4) {
        trustLineAsset = { CreditAlphanum4: modern.CreditAlphanum4 };
      } else if (modern?.CreditAlphanum12) {
        trustLineAsset = { CreditAlphanum12: modern.CreditAlphanum12 };
      } else {
        trustLineAsset = modern;
      }
    } else if (opts.asset?.getLiquidityPoolId) {
      trustLineAsset = { PoolShare: hexToBytes(opts.asset.getLiquidityPoolId()) };
    } else {
      trustLineAsset = opts.asset;
    }
    const modern: any = {
      body: {
        RevokeSponsorship: {
          LedgerEntry: { Trustline: { accountID: pubkey, asset: trustLineAsset } },
        },
      },
      sourceAccount: opts.source ? parseSource(opts.source) : null,
    };
    return wrap(modern);
  }

  static revokeOfferSponsorship(opts: OperationOpts & { seller: string; offerId: string }) {
    validateAddress(opts.seller, 'seller');
    if (!opts.offerId) throw new Error('offerId is invalid');
    validateSource(opts.source);
    const pubkey = { PublicKeyTypeEd25519: StrKey.decodeEd25519PublicKey(opts.seller) };
    const modern: any = {
      body: {
        RevokeSponsorship: {
          LedgerEntry: { Offer: { sellerID: pubkey, offerID: BigInt(opts.offerId) } },
        },
      },
      sourceAccount: opts.source ? parseSource(opts.source) : null,
    };
    return wrap(modern);
  }

  static revokeDataSponsorship(opts: OperationOpts & { account: string; name: string }) {
    validateAddress(opts.account, 'account');
    if (typeof opts.name !== 'string' || !opts.name) throw new Error('name must be a string, up to 64 characters');
    validateSource(opts.source);
    const pubkey = { PublicKeyTypeEd25519: StrKey.decodeEd25519PublicKey(opts.account) };
    const modern: any = {
      body: {
        RevokeSponsorship: {
          LedgerEntry: { Data: { accountID: pubkey, dataName: opts.name } },
        },
      },
      sourceAccount: opts.source ? parseSource(opts.source) : null,
    };
    return wrap(modern);
  }

  static revokeClaimableBalanceSponsorship(opts: OperationOpts & { balanceId: string }) {
    if (!opts.balanceId || typeof opts.balanceId !== 'string') throw new Error('balanceId is invalid');
    validateSource(opts.source);
    // The balanceId is a 72-char hex: 8-char type prefix (00000000) + 64-char hash
    const hashHex = opts.balanceId.length === 72 ? opts.balanceId.slice(8) : opts.balanceId;
    const hashBytes = hexToBytes(hashHex);
    const modern: any = {
      body: {
        RevokeSponsorship: {
          LedgerEntry: { ClaimableBalance: { balanceID: { ClaimableBalanceIdTypeV0: hashBytes } } },
        },
      },
      sourceAccount: opts.source ? parseSource(opts.source) : null,
    };
    return wrap(modern);
  }

  static revokeLiquidityPoolSponsorship(opts: OperationOpts & { liquidityPoolId: string }) {
    if (!opts.liquidityPoolId || typeof opts.liquidityPoolId !== 'string') throw new Error('liquidityPoolId is invalid');
    validateSource(opts.source);
    const modern: any = {
      body: {
        RevokeSponsorship: {
          LedgerEntry: { LiquidityPool: { liquidityPoolID: hexToBytes(opts.liquidityPoolId) } },
        },
      },
      sourceAccount: opts.source ? parseSource(opts.source) : null,
    };
    return wrap(modern);
  }

  static revokeSignerSponsorship(opts: OperationOpts & { account: string; signer: any }) {
    validateAddress(opts.account, 'account');
    validateSource(opts.source);
    const pubkey = { PublicKeyTypeEd25519: StrKey.decodeEd25519PublicKey(opts.account) };
    let signerKey: any;
    if (opts.signer?.ed25519PublicKey) {
      signerKey = { Ed25519: StrKey.decodeEd25519PublicKey(opts.signer.ed25519PublicKey) };
    } else if (opts.signer?.sha256Hash) {
      signerKey = { HashX: coerceHexToBytes(opts.signer.sha256Hash) };
    } else if (opts.signer?.preAuthTx) {
      signerKey = { PreAuthTx: coerceHexToBytes(opts.signer.preAuthTx) };
    } else if (opts.signer?.ed25519SignedPayload) {
      const decoded = SignerKey.decodeAddress(opts.signer.ed25519SignedPayload);
      signerKey = decoded._toModern ? decoded._toModern() : decoded;
    } else {
      throw new Error('signer is invalid');
    }
    const modern: any = {
      body: {
        RevokeSponsorship: {
          Signer: { accountID: pubkey, signerKey },
        },
      },
      sourceAccount: opts.source ? parseSource(opts.source) : null,
    };
    return wrap(modern);
  }

  // Amount utilities
  static toStroops(amount: string): string {
    return toStroops(amount);
  }

  static fromStroops(stroops: string): string {
    return fromStroops(stroops);
  }

  static _fromXDRAmount(value: any): string {
    return fromStroops(value.toString());
  }

  static _toXDRAmount(value: string): string {
    return toStroops(value);
  }

  static _checkUnsignedIntValue(name: string, value: any, isValidFunction?: (v: number) => boolean): any {
    if (value === undefined) return undefined;
    if (value === null) return undefined;
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`${name} value is invalid`);
    }
    if (typeof value === 'string' && value.trim() === '') {
      throw new Error(`${name} value is invalid`);
    }
    // Use Number() for both strings and numbers to get the actual value
    const num = Number(value);
    if (isNaN(num) || !Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
      throw new Error(`${name} value is invalid`);
    }
    if (isValidFunction && !isValidFunction(num)) {
      throw new Error(`${name} value is invalid`);
    }
    return num;
  }

  /**
   * Validate a string amount.
   * @param value - Amount string to validate
   * @param allowZero - Whether zero is allowed (default false)
   */
  static isValidAmount(value: string, allowZero = false): boolean {
    try {
      if (typeof value !== 'string' || value.trim() === '') return false;
      // Reject negative values
      if (value.startsWith('-')) return false;
      // Reject NaN, Infinity etc
      const parsed = parseFloat(value);
      if (!isFinite(parsed)) return false;
      const n = amountToBigInt(value);
      // Max stellar amount: 922337203685.4775807 = 9223372036854775807 stroops
      if (n > 9223372036854775807n) return false;
      if (allowZero) return n >= 0n;
      return n > 0n;
    } catch {
      return false;
    }
  }

  // Decode XDR operation into flat compat object
  static fromXDRObject(xdrOp: any): Operation {
    // Accept both compat xdr.Operation (with _toModern) and modern Operation
    const modern: ModernOperation = xdrOp._toModern ? xdrOp._toModern() : xdrOp;
    return decodeOperation(modern);
  }
}

function parseSource(source: string): any {
  if (StrKey.isValidMed25519PublicKey(source)) {
    const { payload } = decodeStrkey(source);
    const ed25519 = payload.slice(0, 32);
    const view = new DataView(payload.buffer, payload.byteOffset + 32, 8);
    const id = view.getBigUint64(0, false);
    return { MuxedEd25519: { ed25519, id } };
  }
  return { Ed25519: StrKey.decodeEd25519PublicKey(source) };
}

// ---------------------------------------------------------------------------
// Operation — exported as value (static methods) + type (decoded union) + namespace (sub-types)
// ---------------------------------------------------------------------------

// The value: provides static factory methods and fromXDRObject
export const Operation: typeof OperationStatic = OperationStatic;

// The type: a decoded operation is a discriminated union of all sub-types
export type Operation =
  | Operation.CreateAccount
  | Operation.Payment
  | Operation.PathPaymentStrictReceive
  | Operation.PathPaymentStrictSend
  | Operation.ManageSellOffer
  | Operation.ManageBuyOffer
  | Operation.CreatePassiveSellOffer
  | Operation.SetOptions
  | Operation.ChangeTrust
  | Operation.AllowTrust
  | Operation.AccountMerge
  | Operation.Inflation
  | Operation.ManageData
  | Operation.BumpSequence
  | Operation.CreateClaimableBalance
  | Operation.ClaimClaimableBalance
  | Operation.BeginSponsoringFutureReserves
  | Operation.EndSponsoringFutureReserves
  | Operation.RevokeSponsorship
  | Operation.Clawback
  | Operation.ClawbackClaimableBalance
  | Operation.SetTrustLineFlags
  | Operation.LiquidityPoolDeposit
  | Operation.LiquidityPoolWithdraw
  | Operation.InvokeHostFunction
  | Operation.ExtendFootprintTTL
  | Operation.RestoreFootprint;

// The namespace: sub-type interfaces for type narrowing (e.g., Operation.Payment)
export namespace Operation {
  export interface BaseOperation<T extends string = string> {
    type: T;
    source?: string;
    [key: string]: any;
  }

  export interface CreateAccount extends BaseOperation<'createAccount'> {
    destination: string;
    startingBalance: string;
  }

  export interface Payment extends BaseOperation<'payment'> {
    destination: string;
    asset: Asset;
    amount: string;
  }

  export interface PathPaymentStrictReceive extends BaseOperation<'pathPaymentStrictReceive'> {
    sendAsset: Asset;
    sendMax: string;
    destination: string;
    destAsset: Asset;
    destAmount: string;
    path: Asset[];
  }

  export interface PathPaymentStrictSend extends BaseOperation<'pathPaymentStrictSend'> {
    sendAsset: Asset;
    sendAmount: string;
    destination: string;
    destAsset: Asset;
    destMin: string;
    path: Asset[];
  }

  export interface ManageSellOffer extends BaseOperation<'manageSellOffer'> {
    selling: Asset;
    buying: Asset;
    amount: string;
    price: string;
    offerId: string;
  }

  export interface ManageBuyOffer extends BaseOperation<'manageBuyOffer'> {
    selling: Asset;
    buying: Asset;
    buyAmount: string;
    price: string;
    offerId: string;
  }

  export interface CreatePassiveSellOffer extends BaseOperation<'createPassiveSellOffer'> {
    selling: Asset;
    buying: Asset;
    amount: string;
    price: string;
  }

  export interface SetOptions extends BaseOperation<'setOptions'> {
    inflationDest?: string;
    clearFlags?: number;
    setFlags?: number;
    masterWeight?: number;
    lowThreshold?: number;
    medThreshold?: number;
    highThreshold?: number;
    homeDomain?: string;
    signer?: any;
  }

  export interface ChangeTrust extends BaseOperation<'changeTrust'> {
    line: Asset;
    limit: string;
  }

  export interface AllowTrust extends BaseOperation<'allowTrust'> {
    trustor: string;
    assetCode: string;
    authorize: number;
  }

  export interface AccountMerge extends BaseOperation<'accountMerge'> {
    destination: string;
  }

  export interface Inflation extends BaseOperation<'inflation'> {}

  export interface ManageData extends BaseOperation<'manageData'> {
    name: string;
    value: Uint8Array | null;
  }

  export interface BumpSequence extends BaseOperation<'bumpSequence'> {
    bumpTo: string;
  }

  export interface CreateClaimableBalance extends BaseOperation<'createClaimableBalance'> {
    asset: Asset;
    amount: string;
    claimants: any[];
  }

  export interface ClaimClaimableBalance extends BaseOperation<'claimClaimableBalance'> {
    balanceId: any;
  }

  export interface BeginSponsoringFutureReserves extends BaseOperation<'beginSponsoringFutureReserves'> {
    sponsoredId: string;
  }

  export interface EndSponsoringFutureReserves extends BaseOperation<'endSponsoringFutureReserves'> {}

  export interface RevokeSponsorship extends BaseOperation<'revokeSponsorship'> {}
  export interface RevokeAccountSponsorship extends BaseOperation<'revokeSponsorship'> {}
  export interface RevokeTrustlineSponsorship extends BaseOperation<'revokeSponsorship'> {}
  export interface RevokeOfferSponsorship extends BaseOperation<'revokeSponsorship'> {}
  export interface RevokeDataSponsorship extends BaseOperation<'revokeSponsorship'> {}
  export interface RevokeClaimableBalanceSponsorship extends BaseOperation<'revokeSponsorship'> {}
  export interface RevokeLiquidityPoolSponsorship extends BaseOperation<'revokeSponsorship'> {}
  export interface RevokeSignerSponsorship extends BaseOperation<'revokeSponsorship'> {}

  export interface Clawback extends BaseOperation<'clawback'> {
    asset: Asset;
    from: string;
    amount: string;
  }

  export interface ClawbackClaimableBalance extends BaseOperation<'clawbackClaimableBalance'> {
    balanceId: any;
  }

  export interface SetTrustLineFlags extends BaseOperation<'setTrustLineFlags'> {
    trustor: string;
    asset: Asset;
    clearFlags: number;
    setFlags: number;
  }

  export interface LiquidityPoolDeposit extends BaseOperation<'liquidityPoolDeposit'> {
    liquidityPoolId: string;
    maxAmountA: string;
    maxAmountB: string;
    minPrice: string;
    maxPrice: string;
  }

  export interface LiquidityPoolWithdraw extends BaseOperation<'liquidityPoolWithdraw'> {
    liquidityPoolId: string;
    amount: string;
    minAmountA: string;
    minAmountB: string;
  }

  export interface InvokeHostFunction extends BaseOperation<'invokeHostFunction'> {
    func: any;
    auth: any[];
  }

  export interface ExtendFootprintTTL extends BaseOperation<'extendFootprintTtl'> {
    extendTo: number;
  }

  export interface RestoreFootprint extends BaseOperation<'restoreFootprint'> {}
}

// ---------------------------------------------------------------------------
// OperationType namespace — string literal types for each operation
// ---------------------------------------------------------------------------

export namespace OperationType {
  export type CreateAccount = 'createAccount';
  export type Payment = 'payment';
  export type PathPaymentStrictReceive = 'pathPaymentStrictReceive';
  export type PathPaymentStrictSend = 'pathPaymentStrictSend';
  export type ManageSellOffer = 'manageSellOffer';
  export type ManageBuyOffer = 'manageBuyOffer';
  export type CreatePassiveSellOffer = 'createPassiveSellOffer';
  export type SetOptions = 'setOptions';
  export type ChangeTrust = 'changeTrust';
  export type AllowTrust = 'allowTrust';
  export type AccountMerge = 'accountMerge';
  export type Inflation = 'inflation';
  export type ManageData = 'manageData';
  export type BumpSequence = 'bumpSequence';
  export type CreateClaimableBalance = 'createClaimableBalance';
  export type ClaimClaimableBalance = 'claimClaimableBalance';
  export type BeginSponsoringFutureReserves = 'beginSponsoringFutureReserves';
  export type EndSponsoringFutureReserves = 'endSponsoringFutureReserves';
  export type RevokeSponsorship = 'revokeSponsorship';
  export type Clawback = 'clawback';
  export type ClawbackClaimableBalance = 'clawbackClaimableBalance';
  export type SetTrustLineFlags = 'setTrustLineFlags';
  export type LiquidityPoolDeposit = 'liquidityPoolDeposit';
  export type LiquidityPoolWithdraw = 'liquidityPoolWithdraw';
  export type InvokeHostFunction = 'invokeHostFunction';
  export type ExtendFootprintTTL = 'extendFootprintTtl';
  export type RestoreFootprint = 'restoreFootprint';
}

export type OperationType =
  | OperationType.CreateAccount
  | OperationType.Payment
  | OperationType.PathPaymentStrictReceive
  | OperationType.PathPaymentStrictSend
  | OperationType.ManageSellOffer
  | OperationType.ManageBuyOffer
  | OperationType.CreatePassiveSellOffer
  | OperationType.SetOptions
  | OperationType.ChangeTrust
  | OperationType.AllowTrust
  | OperationType.AccountMerge
  | OperationType.Inflation
  | OperationType.ManageData
  | OperationType.BumpSequence
  | OperationType.CreateClaimableBalance
  | OperationType.ClaimClaimableBalance
  | OperationType.BeginSponsoringFutureReserves
  | OperationType.EndSponsoringFutureReserves
  | OperationType.RevokeSponsorship
  | OperationType.Clawback
  | OperationType.ClawbackClaimableBalance
  | OperationType.SetTrustLineFlags
  | OperationType.LiquidityPoolDeposit
  | OperationType.LiquidityPoolWithdraw
  | OperationType.InvokeHostFunction
  | OperationType.ExtendFootprintTTL
  | OperationType.RestoreFootprint;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
