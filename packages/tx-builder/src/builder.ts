import type {
  Operation,
  Memo,
  Preconditions,
  PreconditionsV2,
  TimeBounds,
  LedgerBounds,
  Transaction,
  SignerKey,
} from '@stellar/xdr';
import { parseMuxedAccount } from './helpers.js';
import { transactionHash } from './hash.js';
import { BuiltTransaction } from './transaction.js';

export interface AccountLike {
  address: string;
  sequenceNumber: bigint;
}

export interface TransactionBuilderOptions {
  fee: number;
  networkPassphrase: string;
  memo?: Memo;
  timeBounds?: TimeBounds;
}

export class TransactionBuilder {
  private readonly sourceAccount: AccountLike;
  private readonly baseFee: number;
  private readonly networkPassphrase: string;
  private memo: Memo;
  private operations: Operation[] = [];
  private timeBounds: TimeBounds | null;
  private ledgerBounds: LedgerBounds | null = null;
  private preconditionsV2: Partial<PreconditionsV2> | null = null;

  constructor(sourceAccount: AccountLike, opts: TransactionBuilderOptions) {
    this.sourceAccount = sourceAccount;
    this.baseFee = opts.fee;
    this.networkPassphrase = opts.networkPassphrase;
    this.memo = opts.memo ?? 'None';
    this.timeBounds = opts.timeBounds ?? null;
  }

  addOperation(op: Operation): this {
    this.operations.push(op);
    return this;
  }

  setMemo(memo: Memo): this {
    this.memo = memo;
    return this;
  }

  setTimeout(seconds: number): this {
    const maxTime = BigInt(Math.floor(Date.now() / 1000) + seconds);
    this.timeBounds = { minTime: 0n, maxTime };
    return this;
  }

  setTimeBounds(min: bigint, max: bigint): this {
    this.timeBounds = { minTime: min, maxTime: max };
    return this;
  }

  setLedgerBounds(min: number, max: number): this {
    this.ledgerBounds = { minLedger: min, maxLedger: max };
    return this;
  }

  setPreconditions(v2: Partial<PreconditionsV2>): this {
    this.preconditionsV2 = v2;
    return this;
  }

  async build(): Promise<BuiltTransaction> {
    if (this.operations.length === 0) {
      throw new Error('Transaction must have at least one operation');
    }

    this.sourceAccount.sequenceNumber += 1n;

    const fee = this.baseFee * this.operations.length;
    const cond = this.buildPreconditions();

    const tx: Transaction = {
      sourceAccount: parseMuxedAccount(this.sourceAccount.address),
      fee,
      seqNum: this.sourceAccount.sequenceNumber,
      cond,
      memo: this.memo,
      operations: this.operations,
      ext: '0',
    };

    const hash = await transactionHash(tx, this.networkPassphrase);
    return new BuiltTransaction(tx, hash, this.networkPassphrase);
  }

  private buildPreconditions(): Preconditions {
    if (this.preconditionsV2 !== null || this.ledgerBounds !== null) {
      const v2: PreconditionsV2 = {
        timeBounds: this.preconditionsV2?.timeBounds ?? this.timeBounds,
        ledgerBounds: this.preconditionsV2?.ledgerBounds ?? this.ledgerBounds,
        minSeqNum: this.preconditionsV2?.minSeqNum ?? null,
        minSeqAge: this.preconditionsV2?.minSeqAge ?? 0n,
        minSeqLedgerGap: this.preconditionsV2?.minSeqLedgerGap ?? 0,
        extraSigners: this.preconditionsV2?.extraSigners ?? [],
      };
      return { V2: v2 };
    }
    if (this.timeBounds !== null) {
      return { Time: this.timeBounds };
    }
    return 'None';
  }
}
