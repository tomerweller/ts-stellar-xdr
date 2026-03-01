/**
 * TransactionBuilder compatible with js-stellar-base.
 * Sync build() via @noble/hashes/sha256.
 */

import {
  type Operation as ModernOperation,
  type Memo as ModernMemo,
  type Preconditions as ModernPreconditions,
  type TimeBounds as ModernTimeBounds,
  type Transaction as ModernTransaction,
  type TransactionEnvelope as ModernTransactionEnvelope,
  type SorobanTransactionData as ModernSorobanTransactionData,
  type SignerKey as ModernSignerKey,
  Transaction as TransactionCodec,
  TransactionEnvelope as TransactionEnvelopeCodec,
  SorobanTransactionData as SorobanTransactionDataCodec,
  encodeBase64,
  decodeBase64,
  decodeStrkey,
  STRKEY_ED25519_PUBLIC,
  STRKEY_PRE_AUTH_TX,
  STRKEY_HASH_X,
  STRKEY_SIGNED_PAYLOAD,
  is,
} from '@stellar/xdr';
import { parseMuxedAccount } from '@stellar/tx-builder';
import { hash, networkId } from './signing.js';
import { Account, MuxedAccount } from './account.js';
import { StrKey } from './strkey.js';
import { Memo } from './memo.js';
import { Transaction, FeeBumpTransaction } from './transaction.js';

const ENVELOPE_TYPE_TX = new Uint8Array([0, 0, 0, 2]);
const ENVELOPE_TYPE_TX_FEE_BUMP = new Uint8Array([0, 0, 0, 5]);

/** Convert a StrKey-encoded signer address to a modern SignerKey union */
function parseSignerKey(address: string): ModernSignerKey {
  if (typeof address === 'object') return address as ModernSignerKey;
  const { version, payload } = decodeStrkey(address);
  switch (version) {
    case STRKEY_ED25519_PUBLIC:
      return { Ed25519: new Uint8Array(payload) };
    case STRKEY_PRE_AUTH_TX:
      return { PreAuthTx: new Uint8Array(payload) };
    case STRKEY_HASH_X:
      return { HashX: new Uint8Array(payload) };
    case STRKEY_SIGNED_PAYLOAD: {
      const ed25519 = payload.slice(0, 32);
      const view = new DataView(payload.buffer, payload.byteOffset + 32, 4);
      const payloadLen = view.getUint32(0, false);
      const sigPayload = payload.slice(36, 36 + payloadLen);
      return { Ed25519SignedPayload: { ed25519: new Uint8Array(ed25519), payload: new Uint8Array(sigPayload) } };
    }
    default:
      throw new Error('Invalid signer key type');
  }
}

export interface TransactionBuilderOpts {
  fee: string;
  networkPassphrase?: string;
  memo?: Memo;
  timebounds?: { minTime?: number | string | Date; maxTime?: number | string | Date };
  ledgerbounds?: { minLedger?: number; maxLedger?: number };
  minAccountSequence?: string;
  minAccountSequenceAge?: number;
  minAccountSequenceLedgerGap?: number;
  extraSigners?: string[];
  withMuxing?: boolean;
  sorobanData?: any;
}

export class TransactionBuilder {
  private readonly _source: Account | MuxedAccount;
  private readonly _fee: string;
  private _networkPassphrase: string;
  private _memo: Memo;
  private _operations: ModernOperation[] = [];
  private _timeBounds: { minTime: bigint; maxTime: bigint } | null;
  private _ledgerBounds: { minLedger: number; maxLedger: number } | null = null;
  private _minAccountSequence: bigint | null = null;
  private _minAccountSequenceAge: bigint | null = null;
  private _minAccountSequenceLedgerGap: number | null = null;
  private _extraSigners: string[] = [];
  private _sorobanData: any = null;
  private _timeout: number | null = null;

  constructor(source: Account | MuxedAccount, opts: TransactionBuilderOpts) {
    if (opts.fee == null || opts.fee === '') {
      throw new Error('must specify fee');
    }
    this._source = source;
    this._fee = opts.fee;
    this._networkPassphrase = opts.networkPassphrase ?? '';
    this._memo = opts.memo ?? Memo.none();

    if (opts.timebounds && opts.timebounds.minTime != null && opts.timebounds.maxTime != null) {
      const toTimestamp = (v: string | number | Date): bigint => {
        if (v instanceof Date) return BigInt(Math.floor(v.getTime() / 1000));
        return BigInt(v);
      };
      this._timeBounds = {
        minTime: toTimestamp(opts.timebounds.minTime),
        maxTime: toTimestamp(opts.timebounds.maxTime),
      };
    } else {
      this._timeBounds = null;
    }

    if (opts.ledgerbounds) {
      this._ledgerBounds = {
        minLedger: opts.ledgerbounds.minLedger ?? 0,
        maxLedger: opts.ledgerbounds.maxLedger ?? 0,
      };
    }

    if (opts.minAccountSequence) this._minAccountSequence = BigInt(opts.minAccountSequence);
    if (opts.minAccountSequenceAge != null) this._minAccountSequenceAge = BigInt(opts.minAccountSequenceAge);
    if (opts.minAccountSequenceLedgerGap != null) this._minAccountSequenceLedgerGap = opts.minAccountSequenceLedgerGap;
    if (opts.extraSigners) this._extraSigners = opts.extraSigners;
    if (opts.sorobanData) this._sorobanData = opts.sorobanData;
  }

  addOperation(op: any): this {
    // op is either a modern Operation or a compat Operation
    if (op._toModern) {
      this._operations.push(op._toModern());
    } else {
      this._operations.push(op);
    }
    return this;
  }

  addOperationAt(op: any, index: number): this {
    const modernOp = op._toModern ? op._toModern() : op;
    this._operations.splice(index, 0, modernOp);
    return this;
  }

  clearOperations(): this {
    this._operations = [];
    return this;
  }

  clearOperationAt(index: number): this {
    this._operations.splice(index, 1);
    return this;
  }

  addMemo(memo: Memo): this {
    this._memo = memo;
    return this;
  }

  setTimeout(seconds: number): this {
    if (seconds < 0) {
      throw new Error('timeout cannot be negative');
    }
    if (this._timeBounds && this._timeBounds.maxTime > 0n) {
      throw new Error('TimeBounds.max_time has been already set.');
    }
    if (seconds === 0) {
      // Infinite timeout
      this._timeBounds = {
        minTime: this._timeBounds?.minTime ?? 0n,
        maxTime: 0n,
      };
    } else {
      const maxTime = BigInt(Math.floor(Date.now() / 1000) + seconds);
      this._timeBounds = {
        minTime: this._timeBounds?.minTime ?? 0n,
        maxTime,
      };
    }
    return this;
  }

  setTimebounds(min: number | string | Date, max: number | string | Date): this {
    const toBigInt = (v: number | string | Date): bigint => {
      if (v instanceof Date) return BigInt(Math.floor(v.getTime() / 1000));
      return BigInt(v);
    };
    this._timeBounds = { minTime: toBigInt(min), maxTime: toBigInt(max) };
    return this;
  }

  setLedgerbounds(min: number, max: number): this {
    this._ledgerBounds = { minLedger: min, maxLedger: max };
    return this;
  }

  setMinAccountSequence(seq: string): this {
    this._minAccountSequence = BigInt(seq);
    return this;
  }

  setMinAccountSequenceAge(seconds: number): this {
    this._minAccountSequenceAge = BigInt(seconds);
    return this;
  }

  setMinAccountSequenceLedgerGap(gap: number): this {
    this._minAccountSequenceLedgerGap = gap;
    return this;
  }

  setExtraSigners(signers: string[]): this {
    this._extraSigners = signers;
    return this;
  }

  setNetworkPassphrase(passphrase: string): this {
    this._networkPassphrase = passphrase;
    return this;
  }

  setSorobanData(data: any): this {
    this._sorobanData = typeof data === 'string' ? data : data;
    return this;
  }

  private _resolveSorobanData(): ModernSorobanTransactionData {
    if (!this._sorobanData) throw new Error('No soroban data set');
    if (typeof this._sorobanData === 'string') {
      return SorobanTransactionDataCodec.fromBase64(this._sorobanData);
    }
    if (typeof this._sorobanData._toModern === 'function') {
      return this._sorobanData._toModern();
    }
    if (typeof this._sorobanData.build === 'function') {
      const built = this._sorobanData.build();
      return typeof built._toModern === 'function' ? built._toModern() : built;
    }
    return this._sorobanData;
  }

  hasV2Preconditions(): boolean {
    return !!(
      this._ledgerBounds ||
      this._minAccountSequence !== null ||
      this._minAccountSequenceAge !== null ||
      this._minAccountSequenceLedgerGap !== null ||
      this._extraSigners.length > 0
    );
  }

  /**
   * Synchronous build — computes transaction hash via @noble/hashes/sha256.
   */
  build(): Transaction {
    if (this._timeBounds === null) {
      throw new Error('TimeBounds has to be set or you must call setTimeout(TimeoutInfinite).');
    }

    // Increment sequence
    this._source.incrementSequenceNumber();

    let fee = parseInt(this._fee, 10) * this._operations.length;

    let cond: ModernPreconditions;
    if (this.hasV2Preconditions()) {
      cond = {
        V2: {
          timeBounds: this._timeBounds
            ? { minTime: this._timeBounds.minTime, maxTime: this._timeBounds.maxTime }
            : null,
          ledgerBounds: this._ledgerBounds ?? null,
          minSeqNum: this._minAccountSequence,
          minSeqAge: this._minAccountSequenceAge ?? 0n,
          minSeqLedgerGap: this._minAccountSequenceLedgerGap ?? 0,
          extraSigners: this._extraSigners.map(s => typeof s === 'string' ? parseSignerKey(s) : s) as any,
        },
      };
    } else if (this._timeBounds) {
      cond = {
        Time: {
          minTime: this._timeBounds.minTime,
          maxTime: this._timeBounds.maxTime,
        },
      };
    } else {
      cond = 'None';
    }

    const sourceAddress = this._source instanceof Account
      ? (this._source as Account).accountId()
      : (this._source as MuxedAccount).accountId();

    const tx: ModernTransaction = {
      sourceAccount: parseMuxedAccount(sourceAddress),
      fee,
      seqNum: BigInt(this._source.sequenceNumber()),
      cond,
      memo: this._memo._toModern(),
      operations: this._operations,
      ext: this._sorobanData ? { '1': this._resolveSorobanData() } : '0',
    };

    // Compute hash synchronously
    const nid = networkId(this._networkPassphrase);
    const txBytes = TransactionCodec.toXdr(tx);
    const tagged = new Uint8Array(nid.length + ENVELOPE_TYPE_TX.length + txBytes.length);
    tagged.set(nid, 0);
    tagged.set(ENVELOPE_TYPE_TX, nid.length);
    tagged.set(txBytes, nid.length + ENVELOPE_TYPE_TX.length);
    const txHash = hash(tagged);

    // Create envelope → base64 → Transaction
    const envelope: ModernTransactionEnvelope = { Tx: { tx, signatures: [] } };
    const base64 = encodeBase64(TransactionEnvelopeCodec.toXdr(envelope));
    return new Transaction(base64, this._networkPassphrase);
  }

  /**
   * Clone a Transaction into a new TransactionBuilder for modification.
   */
  static cloneFrom(
    tx: Transaction,
    opts?: Partial<TransactionBuilderOpts>,
  ): TransactionBuilder {
    const seqMinusOne = (BigInt(tx.sequence) - 1n).toString();
    let sourceAccount: Account | MuxedAccount;
    if (StrKey.isValidMed25519PublicKey(tx.source)) {
      // Muxed account source
      sourceAccount = (MuxedAccount as any).fromAddress(tx.source, seqMinusOne);
    } else {
      sourceAccount = new Account(tx.source, seqMinusOne);
    }
    const builder = new TransactionBuilder(sourceAccount, {
      fee: (parseInt(tx.fee, 10) / (tx.operations.length || 1)).toString(),
      networkPassphrase: tx.networkPassphrase,
      ...(opts || {}),
    });
    if (tx.timeBounds) {
      builder.setTimebounds(tx.timeBounds.minTime, tx.timeBounds.maxTime);
    }
    builder.addMemo(tx.memo);
    // Use modern operations from the internal tx to preserve proper XDR structures.
    // The decoded tx.operations are flat compat objects that can't be re-serialized.
    const modernOps = tx._getModernTx().operations;
    for (const op of modernOps) {
      builder.addOperation(op);
    }
    return builder;
  }

  /**
   * Parse an XDR envelope into a Transaction or FeeBumpTransaction.
   */
  static fromXDR(
    envelope: string | Uint8Array | any,
    networkPassphrase: string,
  ): Transaction | FeeBumpTransaction {
    let base64: string;
    if (typeof envelope === 'string') {
      base64 = envelope;
    } else if (envelope instanceof Uint8Array) {
      base64 = encodeBase64(envelope);
    } else if (envelope && typeof envelope._toModern === 'function') {
      // Compat envelope object
      base64 = encodeBase64(TransactionEnvelopeCodec.toXdr(envelope._toModern()));
    } else if (envelope && typeof envelope.toXDR === 'function') {
      // Compat envelope with toXDR method
      const raw = envelope.toXDR('raw');
      base64 = encodeBase64(raw);
    } else {
      // Assume modern object
      base64 = encodeBase64(TransactionEnvelopeCodec.toXdr(envelope));
    }

    const envBytes = decodeBase64(base64);
    const env = TransactionEnvelopeCodec.fromXdr(envBytes);

    if (is(env, 'Tx') || is(env, 'TxV0')) {
      // Transaction constructor handles both V0 and V1 envelopes
      return new Transaction(base64, networkPassphrase);
    }
    if (is(env, 'TxFeeBump')) {
      return new FeeBumpTransaction(base64, networkPassphrase);
    }
    throw new Error('Unsupported envelope type');
  }

  /**
   * Build a fee bump transaction wrapping an inner transaction.
   */
  static buildFeeBumpTransaction(
    feeSource: string | { publicKey(): string },
    baseFee: string,
    innerTx: Transaction,
    networkPassphrase: string,
  ): FeeBumpTransaction {
    const BASE_FEE = 100;

    // Accept Keypair or string (including M-addresses for muxed accounts)
    const feeSourceAddress = typeof feeSource === 'string'
      ? feeSource
      : feeSource.publicKey();

    // Convert compat signatures to modern format
    const modernSigs = (innerTx.signatures as any[]).map((sig: any) => {
      if (typeof sig._toModern === 'function') return sig._toModern();
      if (typeof sig.hint === 'function') return { hint: sig.hint(), signature: sig.signature() };
      return sig;
    });

    // Get the modern envelope directly (toEnvelope returns compat, so use _toModern or build directly)
    const modernTx = innerTx._getModernTx();
    const modernEnvelope: ModernTransactionEnvelope = {
      Tx: { tx: modernTx, signatures: modernSigs },
    };
    if (!is(modernEnvelope, 'Tx')) {
      throw new Error('Expected a TransactionV1 envelope');
    }

    const innerV1 = modernEnvelope.Tx;
    const innerOps = innerV1.tx.operations.length;

    // Extract resource fee from soroban data if present
    let resourceFee = 0n;
    const ext = innerV1.tx.ext;
    if (typeof ext === 'object' && '1' in ext) {
      resourceFee = BigInt(ext['1'].resourceFee);
    }

    // Calculate inner tx fee rate (per operation, excluding resource fee)
    const innerFee = BigInt(innerTx.fee);
    const innerBaseFeeRate = (innerFee - resourceFee) / BigInt(innerOps);

    // baseFee must be at least the inner tx fee rate and at least BASE_FEE
    const baseFeeNum = BigInt(baseFee);
    const minBaseFee = innerBaseFeeRate > BigInt(BASE_FEE) ? innerBaseFeeRate : BigInt(BASE_FEE);
    if (baseFeeNum < minBaseFee) {
      throw new Error(`Invalid baseFee, it should be at least ${minBaseFee} stroops.`);
    }

    // Total fee = baseFee * (innerOps + 1) + resourceFee
    const fee = baseFeeNum * BigInt(innerOps + 1) + resourceFee;

    const feeBumpTx = {
      feeSource: parseMuxedAccount(feeSourceAddress),
      fee,
      innerTx: { Tx: innerV1 },
      ext: '0' as const,
    };

    const fbEnvelope: ModernTransactionEnvelope = {
      TxFeeBump: { tx: feeBumpTx, signatures: [] },
    };

    const base64 = encodeBase64(TransactionEnvelopeCodec.toXdr(fbEnvelope));
    return new FeeBumpTransaction(base64, networkPassphrase);
  }
}
