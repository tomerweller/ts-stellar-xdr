import { describe, it, expect } from 'vitest';
import { TransactionBuilder } from '../src/transaction-builder.js';
import { Account } from '../src/account.js';
import { Asset } from '../src/asset.js';
import { Memo } from '../src/memo.js';
import { Operation } from '../src/operation.js';
import { Keypair } from '../src/keypair.js';
import { Transaction, FeeBumpTransaction } from '../src/transaction.js';
import { Networks, BASE_FEE, TimeoutInfinite } from '../src/networks.js';

const SECRET1 = 'SDL2ENWLAB7NHNVZUWTSZO23D3YLF4YUKUBHLWDVHKNDFJ37VDQ2RI53';
const PUBKEY1 = 'GBMZSZP7FWHX6OTYMKCUS55EHT2DECX3IIIMZP4AAMSWYX3VVAED5JVC';
const DEST = 'GAT4KBPBCPTOLGILH5NNTBWSXHEBUTRQMEUSQGSPCCFM4QHO2COADB5O';

describe('TransactionBuilder', () => {
  it('builds a payment transaction synchronously', () => {
    const account = new Account(PUBKEY1, '100');
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });

    builder.addOperation(
      Operation.payment({
        destination: DEST,
        asset: Asset.native(),
        amount: '10',
      }),
    );
    builder.setTimeout(30);

    const tx = builder.build();
    expect(tx).toBeInstanceOf(Transaction);
    expect(tx.source).toBe(PUBKEY1);
    expect(tx.fee).toBe('100');
    expect(tx.sequence).toBe('101');
    expect(account.sequenceNumber()).toBe('101');
  });

  it('signs and serializes', () => {
    const kp = Keypair.fromSecret(SECRET1);
    const account = new Account(PUBKEY1, '200');
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });

    builder.addOperation(
      Operation.payment({
        destination: DEST,
        asset: Asset.native(),
        amount: '5',
      }),
    );
    builder.setTimeout(TimeoutInfinite);

    const tx = builder.build();
    tx.sign(kp);
    expect(tx.signatures.length).toBe(1);

    const xdr = tx.toXDR();
    expect(typeof xdr).toBe('string');
    expect(xdr.length).toBeGreaterThan(0);
  });

  it('fromXDR roundtrips', () => {
    const account = new Account(PUBKEY1, '300');
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });

    builder.addOperation(
      Operation.createAccount({
        destination: DEST,
        startingBalance: '100',
      }),
    );
    builder.setTimeout(30);

    const tx = builder.build();
    const xdr = tx.toXDR();

    const parsed = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    expect(parsed).toBeInstanceOf(Transaction);
    expect((parsed as Transaction).source).toBe(PUBKEY1);
  });

  it('builds fee bump transaction', () => {
    const account = new Account(PUBKEY1, '400');
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });

    builder.addOperation(
      Operation.payment({
        destination: DEST,
        asset: Asset.native(),
        amount: '1',
      }),
    );
    builder.setTimeout(30);

    const innerTx = builder.build();
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      PUBKEY1,
      '200',
      innerTx,
      Networks.TESTNET,
    );

    expect(feeBump).toBeInstanceOf(FeeBumpTransaction);
    expect(feeBump.feeSource).toBe(PUBKEY1);
  });

  it('requires at least one operation', () => {
    const account = new Account(PUBKEY1, '500');
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });
    builder.setTimeout(30);
    expect(() => builder.build()).toThrow('at least one operation');
  });

  it('requires timeout or timebounds', () => {
    const account = new Account(PUBKEY1, '600');
    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });
    builder.addOperation(
      Operation.payment({
        destination: DEST,
        asset: Asset.native(),
        amount: '1',
      }),
    );
    expect(() => builder.build()).toThrow('TimeBounds');
  });
});
