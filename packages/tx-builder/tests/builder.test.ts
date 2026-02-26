import { describe, it, expect } from 'vitest';
import { TransactionBuilder, type AccountLike } from '../src/builder.js';
import { Keypair } from '../src/keypair.js';
import { payment, createAccount } from '../src/operations.js';
import { nativeAsset, memoText } from '../src/helpers.js';
import { Networks } from '../src/networks.js';
import { BuiltTransaction } from '../src/transaction.js';
import { is } from '@stellar/xdr';

const TEST_SECRET = 'SDL2ENWLAB7NHNVZUWTSZO23D3YLF4YUKUBHLWDVHKNDFJ37VDQ2RI53';
const DEST_PUBKEY = 'GAT4KBPBCPTOLGILH5NNTBWSXHEBUTRQMEUSQGSPCCFM4QHO2COADB5O';

describe('TransactionBuilder', () => {
  it('builds a simple payment transaction', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 100n };

    const tx = await new TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeout(300)
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 10_0000000n }))
      .build();

    expect(tx).toBeInstanceOf(BuiltTransaction);
    expect(tx.hash.length).toBe(32);
    expect(tx.tx.operations.length).toBe(1);
    expect(tx.tx.fee).toBe(100);
    expect(tx.tx.seqNum).toBe(101n);
    // source account sequence was incremented
    expect(account.sequenceNumber).toBe(101n);
  });

  it('increments sequence number', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

    await new TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeout(300)
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 1n }))
      .build();

    expect(account.sequenceNumber).toBe(1n);
  });

  it('calculates fee based on operation count', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

    const tx = await new TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeout(300)
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 1n }))
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 2n }))
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 3n }))
      .build();

    expect(tx.tx.fee).toBe(300); // 100 * 3 operations
    expect(tx.tx.operations.length).toBe(3);
  });

  it('rejects empty operations', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

    await expect(
      new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      }).build(),
    ).rejects.toThrow('at least one operation');
  });

  it('sets memo', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

    const tx = await new TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeout(300)
      .setMemo(memoText('test memo'))
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 1n }))
      .build();

    expect(is(tx.tx.memo, 'Text')).toBe(true);
  });

  it('sets time bounds', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

    const tx = await new TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeBounds(1000n, 2000n)
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 1n }))
      .build();

    expect(is(tx.tx.cond, 'Time')).toBe(true);
    if (is(tx.tx.cond, 'Time')) {
      expect(tx.tx.cond.Time.minTime).toBe(1000n);
      expect(tx.tx.cond.Time.maxTime).toBe(2000n);
    }
  });

  it('upgrades to V2 preconditions with ledger bounds', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

    const tx = await new TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeBounds(0n, 9999n)
      .setLedgerBounds(100, 200)
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 1n }))
      .build();

    expect(is(tx.tx.cond, 'V2')).toBe(true);
    if (is(tx.tx.cond, 'V2')) {
      expect(tx.tx.cond.V2.ledgerBounds).toEqual({ minLedger: 100, maxLedger: 200 });
    }
  });

  it('signs and serializes', async () => {
    const kp = await Keypair.fromSecret(TEST_SECRET);
    const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

    const tx = await new TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeout(300)
      .addOperation(payment({ destination: DEST_PUBKEY, asset: nativeAsset(), amount: 1n }))
      .build();

    await tx.sign(kp);
    const base64 = tx.toBase64();
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);

    // Deserialize and verify hash matches
    const restored = await BuiltTransaction.fromBase64(base64, Networks.TESTNET);
    expect(restored).toBeInstanceOf(BuiltTransaction);
    if (restored instanceof BuiltTransaction) {
      expect(restored.hash).toEqual(tx.hash);
    }
  });
});
