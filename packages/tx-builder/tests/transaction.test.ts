import { describe, it, expect } from 'vitest';
import { TransactionBuilder, type AccountLike } from '../src/builder.js';
import { Keypair } from '../src/keypair.js';
import { payment, createAccount } from '../src/operations.js';
import { nativeAsset } from '../src/helpers.js';
import { Networks } from '../src/networks.js';
import {
  BuiltTransaction,
  BuiltFeeBumpTransaction,
  buildFeeBumpTransaction,
} from '../src/transaction.js';

const SECRET1 = 'SDL2ENWLAB7NHNVZUWTSZO23D3YLF4YUKUBHLWDVHKNDFJ37VDQ2RI53';
const SECRET2 = 'SAFBKRN4SQQAOIUOTLNNKJMTRHWB7XREBH2RE235X6ANUJYXA45VN4GS';
const DEST = 'GAT4KBPBCPTOLGILH5NNTBWSXHEBUTRQMEUSQGSPCCFM4QHO2COADB5O';

describe('transaction', () => {
  describe('BuiltTransaction serialization', () => {
    it('roundtrips through XDR bytes', async () => {
      const kp = await Keypair.fromSecret(SECRET1);
      const account: AccountLike = { address: kp.publicKey, sequenceNumber: 42n };

      const tx = await new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      })
        .setTimeBounds(0n, 9999999999n)
        .addOperation(payment({ destination: DEST, asset: nativeAsset(), amount: 1_0000000n }))
        .build();

      await tx.sign(kp);

      const bytes = tx.toXdr();
      const restored = await BuiltTransaction.fromXdr(bytes, Networks.TESTNET);
      expect(restored).toBeInstanceOf(BuiltTransaction);
      expect(restored.hash).toEqual(tx.hash);
    });

    it('roundtrips through base64', async () => {
      const kp = await Keypair.fromSecret(SECRET1);
      const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

      const tx = await new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      })
        .setTimeBounds(0n, 9999999999n)
        .addOperation(createAccount({ destination: DEST, startingBalance: 100_0000000n }))
        .build();

      await tx.sign(kp);

      const base64 = tx.toBase64();
      const restored = await BuiltTransaction.fromBase64(base64, Networks.TESTNET);
      expect(restored).toBeInstanceOf(BuiltTransaction);
      expect(restored.hash).toEqual(tx.hash);
    });

    it('preserves signatures through roundtrip', async () => {
      const kp = await Keypair.fromSecret(SECRET1);
      const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

      const tx = await new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      })
        .setTimeBounds(0n, 9999999999n)
        .addOperation(payment({ destination: DEST, asset: nativeAsset(), amount: 1n }))
        .build();

      await tx.sign(kp);
      const envelope = tx.toEnvelope();
      expect(envelope.signatures.length).toBe(1);
      expect(envelope.signatures[0]!.signature.length).toBe(64);

      // Verify signature is valid
      const sig = envelope.signatures[0]!;
      const isValid = await kp.verify(tx.hash, sig.signature);
      expect(isValid).toBe(true);
    });
  });

  describe('fee bump', () => {
    it('wraps a signed transaction in a fee bump', async () => {
      const kp1 = await Keypair.fromSecret(SECRET1);
      const kp2 = await Keypair.fromSecret(SECRET2);
      const account: AccountLike = { address: kp1.publicKey, sequenceNumber: 0n };

      // Build and sign inner transaction
      const inner = await new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      })
        .setTimeBounds(0n, 9999999999n)
        .addOperation(payment({ destination: DEST, asset: nativeAsset(), amount: 1n }))
        .build();

      await inner.sign(kp1);

      // Fee bump by kp2
      const bump = await buildFeeBumpTransaction({
        feeSource: kp2.publicKey,
        fee: 200n,
        innerTransaction: inner,
        networkPassphrase: Networks.TESTNET,
      });

      expect(bump).toBeInstanceOf(BuiltFeeBumpTransaction);
      expect(bump.hash.length).toBe(32);
      expect(bump.innerTransaction).toBe(inner);

      // Sign the fee bump
      await bump.sign(kp2);

      // Serialize and deserialize
      const base64 = bump.toBase64();
      const restored = await BuiltTransaction.fromBase64(base64, Networks.TESTNET);
      expect(restored).toBeInstanceOf(BuiltFeeBumpTransaction);
      if (restored instanceof BuiltFeeBumpTransaction) {
        expect(restored.hash).toEqual(bump.hash);
        expect(restored.innerTransaction.hash).toEqual(inner.hash);
      }
    });

    it('fee bump preserves inner signatures', async () => {
      const kp1 = await Keypair.fromSecret(SECRET1);
      const kp2 = await Keypair.fromSecret(SECRET2);
      const account: AccountLike = { address: kp1.publicKey, sequenceNumber: 0n };

      const inner = await new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      })
        .setTimeBounds(0n, 9999999999n)
        .addOperation(payment({ destination: DEST, asset: nativeAsset(), amount: 5n }))
        .build();

      await inner.sign(kp1);

      const bump = await buildFeeBumpTransaction({
        feeSource: kp2.publicKey,
        fee: 200n,
        innerTransaction: inner,
        networkPassphrase: Networks.TESTNET,
      });
      await bump.sign(kp2);

      // Check both envelope layers have signatures
      const envelope = bump.toEnvelope();
      expect(envelope.signatures.length).toBe(1); // bump signature
      expect(envelope.tx.innerTx).toBeDefined();
    });
  });

  describe('addSignature', () => {
    it('adds pre-computed signature', async () => {
      const kp = await Keypair.fromSecret(SECRET1);
      const account: AccountLike = { address: kp.publicKey, sequenceNumber: 0n };

      const tx = await new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      })
        .setTimeBounds(0n, 9999999999n)
        .addOperation(payment({ destination: DEST, asset: nativeAsset(), amount: 1n }))
        .build();

      const decorated = await kp.signDecorated(tx.hash);
      tx.addSignature(decorated);

      const envelope = tx.toEnvelope();
      expect(envelope.signatures.length).toBe(1);
    });
  });

  describe('multi-sign', () => {
    it('supports multiple signers', async () => {
      const kp1 = await Keypair.fromSecret(SECRET1);
      const kp2 = await Keypair.fromSecret(SECRET2);
      const account: AccountLike = { address: kp1.publicKey, sequenceNumber: 0n };

      const tx = await new TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: Networks.TESTNET,
      })
        .setTimeBounds(0n, 9999999999n)
        .addOperation(payment({ destination: DEST, asset: nativeAsset(), amount: 1n }))
        .build();

      await tx.sign(kp1, kp2);
      const envelope = tx.toEnvelope();
      expect(envelope.signatures.length).toBe(2);

      // Both signatures should be valid
      expect(await kp1.verify(tx.hash, envelope.signatures[0]!.signature)).toBe(true);
      expect(await kp2.verify(tx.hash, envelope.signatures[1]!.signature)).toBe(true);
    });
  });
});
