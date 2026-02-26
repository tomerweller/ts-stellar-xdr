import { describe, it, expect } from 'vitest';
import {
  Operation as OperationCodec,
  type Operation,
  is,
} from '@stellar/xdr';
import {
  createAccount,
  payment,
  pathPaymentStrictReceive,
  pathPaymentStrictSend,
  manageSellOffer,
  manageBuyOffer,
  createPassiveSellOffer,
  setOptions,
  changeTrust,
  allowTrust,
  accountMerge,
  inflation,
  manageData,
  bumpSequence,
  beginSponsoringFutureReserves,
  endSponsoringFutureReserves,
  clawback,
  setTrustLineFlags,
  liquidityPoolDeposit,
  liquidityPoolWithdraw,
  extendFootprintTtl,
  restoreFootprint,
} from '../src/operations.js';
import { nativeAsset, creditAsset } from '../src/helpers.js';

const PUBKEY1 = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';
const PUBKEY2 = 'GAT4KBPBCPTOLGILH5NNTBWSXHEBUTRQMEUSQGSPCCFM4QHO2COADB5O';

function roundtrip(op: Operation): Operation {
  const bytes = OperationCodec.toXdr(op);
  return OperationCodec.fromXdr(bytes);
}

describe('operations', () => {
  it('createAccount roundtrips', () => {
    const op = createAccount({ destination: PUBKEY2, startingBalance: 100_0000000n });
    const rt = roundtrip(op);
    expect(rt.sourceAccount).toBeNull();
    expect(is(rt.body, 'CreateAccount')).toBe(true);
  });

  it('createAccount with source', () => {
    const op = createAccount({ destination: PUBKEY2, startingBalance: 100_0000000n, source: PUBKEY1 });
    const rt = roundtrip(op);
    expect(rt.sourceAccount).not.toBeNull();
  });

  it('payment roundtrips', () => {
    const op = payment({ destination: PUBKEY2, asset: nativeAsset(), amount: 50_0000000n });
    const rt = roundtrip(op);
    expect(is(rt.body, 'Payment')).toBe(true);
  });

  it('payment with credit asset', () => {
    const asset = creditAsset('USD', PUBKEY1);
    const op = payment({ destination: PUBKEY2, asset, amount: 10_0000000n });
    const rt = roundtrip(op);
    expect(is(rt.body, 'Payment')).toBe(true);
  });

  it('pathPaymentStrictReceive roundtrips', () => {
    const op = pathPaymentStrictReceive({
      sendAsset: nativeAsset(),
      sendMax: 100n,
      destination: PUBKEY2,
      destAsset: creditAsset('USD', PUBKEY1),
      destAmount: 50n,
      path: [],
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'PathPaymentStrictReceive')).toBe(true);
  });

  it('pathPaymentStrictSend roundtrips', () => {
    const op = pathPaymentStrictSend({
      sendAsset: nativeAsset(),
      sendAmount: 100n,
      destination: PUBKEY2,
      destAsset: creditAsset('EUR', PUBKEY1),
      destMin: 50n,
      path: [nativeAsset()],
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'PathPaymentStrictSend')).toBe(true);
  });

  it('manageSellOffer roundtrips', () => {
    const op = manageSellOffer({
      selling: nativeAsset(),
      buying: creditAsset('USD', PUBKEY1),
      amount: 1000n,
      price: { n: 1, d: 2 },
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'ManageSellOffer')).toBe(true);
  });

  it('manageBuyOffer roundtrips', () => {
    const op = manageBuyOffer({
      selling: nativeAsset(),
      buying: creditAsset('USD', PUBKEY1),
      buyAmount: 500n,
      price: { n: 3, d: 4 },
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'ManageBuyOffer')).toBe(true);
  });

  it('createPassiveSellOffer roundtrips', () => {
    const op = createPassiveSellOffer({
      selling: nativeAsset(),
      buying: creditAsset('BTC', PUBKEY1),
      amount: 200n,
      price: { n: 1, d: 1 },
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'CreatePassiveSellOffer')).toBe(true);
  });

  it('setOptions roundtrips', () => {
    const op = setOptions({ homeDomain: 'example.com' });
    const rt = roundtrip(op);
    expect(is(rt.body, 'SetOptions')).toBe(true);
  });

  it('changeTrust roundtrips', () => {
    const op = changeTrust({ asset: creditAsset('USD', PUBKEY1) });
    const rt = roundtrip(op);
    expect(is(rt.body, 'ChangeTrust')).toBe(true);
  });

  it('allowTrust roundtrips', () => {
    const op = allowTrust({ trustor: PUBKEY2, assetCode: 'USD', authorize: 1 });
    const rt = roundtrip(op);
    expect(is(rt.body, 'AllowTrust')).toBe(true);
  });

  it('accountMerge roundtrips', () => {
    const op = accountMerge({ destination: PUBKEY2 });
    const rt = roundtrip(op);
    expect(is(rt.body, 'AccountMerge')).toBe(true);
  });

  it('inflation roundtrips', () => {
    const op = inflation();
    const rt = roundtrip(op);
    expect(rt.body).toBe('Inflation');
  });

  it('manageData roundtrips', () => {
    const op = manageData({ name: 'test', value: new Uint8Array([1, 2, 3]) });
    const rt = roundtrip(op);
    expect(is(rt.body, 'ManageData')).toBe(true);
  });

  it('manageData delete roundtrips', () => {
    const op = manageData({ name: 'test', value: null });
    const rt = roundtrip(op);
    expect(is(rt.body, 'ManageData')).toBe(true);
    if (is(rt.body, 'ManageData')) {
      expect(rt.body.ManageData.dataValue).toBeNull();
    }
  });

  it('bumpSequence roundtrips', () => {
    const op = bumpSequence({ bumpTo: 123456789n });
    const rt = roundtrip(op);
    expect(is(rt.body, 'BumpSequence')).toBe(true);
  });

  it('beginSponsoringFutureReserves roundtrips', () => {
    const op = beginSponsoringFutureReserves({ sponsoredID: PUBKEY2 });
    const rt = roundtrip(op);
    expect(is(rt.body, 'BeginSponsoringFutureReserves')).toBe(true);
  });

  it('endSponsoringFutureReserves roundtrips', () => {
    const op = endSponsoringFutureReserves();
    const rt = roundtrip(op);
    expect(rt.body).toBe('EndSponsoringFutureReserves');
  });

  it('clawback roundtrips', () => {
    const op = clawback({
      asset: creditAsset('USD', PUBKEY1),
      from: PUBKEY2,
      amount: 100n,
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'Clawback')).toBe(true);
  });

  it('setTrustLineFlags roundtrips', () => {
    const op = setTrustLineFlags({
      trustor: PUBKEY2,
      asset: creditAsset('USD', PUBKEY1),
      clearFlags: 0,
      setFlags: 1,
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'SetTrustLineFlags')).toBe(true);
  });

  it('liquidityPoolDeposit roundtrips', () => {
    const poolID = new Uint8Array(32).fill(0xab);
    const op = liquidityPoolDeposit({
      liquidityPoolID: poolID,
      maxAmountA: 100n,
      maxAmountB: 200n,
      minPrice: { n: 1, d: 1 },
      maxPrice: { n: 2, d: 1 },
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'LiquidityPoolDeposit')).toBe(true);
  });

  it('liquidityPoolWithdraw roundtrips', () => {
    const poolID = new Uint8Array(32).fill(0xab);
    const op = liquidityPoolWithdraw({
      liquidityPoolID: poolID,
      amount: 100n,
      minAmountA: 50n,
      minAmountB: 50n,
    });
    const rt = roundtrip(op);
    expect(is(rt.body, 'LiquidityPoolWithdraw')).toBe(true);
  });

  it('extendFootprintTtl roundtrips', () => {
    const op = extendFootprintTtl({ extendTo: 1000 });
    const rt = roundtrip(op);
    expect(is(rt.body, 'ExtendFootprintTtl')).toBe(true);
  });

  it('restoreFootprint roundtrips', () => {
    const op = restoreFootprint();
    const rt = roundtrip(op);
    expect(is(rt.body, 'RestoreFootprint')).toBe(true);
  });
});
