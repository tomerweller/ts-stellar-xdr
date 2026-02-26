/**
 * Horizon API types for the compat layer.
 * Re-exports record types from @stellar/horizon-client and adds
 * compat-specific types (CollectionPage, AccountResponse).
 */

import { Account } from '@stellar/stellar-base-comp';
import type {
  AccountRecord,
  BalanceLine,
  AccountSigner,
  AccountThresholds,
  Flags,
} from '@stellar/horizon-client';

// Re-export all record types from horizon-client
export type {
  RootResponse,
  FeeStatsResponse,
  FeeDistribution,
  AccountRecord,
  AccountDataRecord,
  BalanceLine,
  BalanceLineNative,
  BalanceLineAsset,
  BalanceLineLiquidityPool,
  AccountSigner,
  AccountThresholds,
  Flags,
  LedgerRecord,
  TransactionRecord,
  TransactionPreconditions,
  FeeBumpTransactionInfo,
  InnerTransactionInfo,
  OperationType,
  OperationRecord,
  EffectRecord,
  OfferRecord,
  OfferAssetInfo,
  TradeRecord,
  AssetRecord,
  AssetAccounts,
  AssetBalances,
  ClaimableBalanceRecord,
  Claimant,
  ClaimantPredicate,
  LiquidityPoolRecord,
  LiquidityPoolReserve,
  OrderBookResponse,
  OrderBookLevel,
  PathRecord,
  TradeAggregationRecord,
  SubmitTransactionResponse,
  SubmitAsyncTransactionResponse,
} from '@stellar/horizon-client';

// ---------------------------------------------------------------------------
// CollectionPage — paginated result with next()/prev()
// ---------------------------------------------------------------------------

export interface CollectionPage<T> {
  records: T[];
  next(): Promise<CollectionPage<T>>;
  prev(): Promise<CollectionPage<T>>;
}

// ---------------------------------------------------------------------------
// AccountResponse — returned by loadAccount(), usable with TransactionBuilder
// ---------------------------------------------------------------------------

export class AccountResponse extends Account {
  declare readonly id: string;
  declare readonly account_id: string;
  declare readonly subentry_count: number;
  declare readonly last_modified_ledger: number;
  declare readonly last_modified_time: string;
  declare readonly thresholds: AccountThresholds;
  declare readonly flags: Flags;
  declare readonly balances: BalanceLine[];
  declare readonly signers: AccountSigner[];
  declare readonly data: Record<string, string>;
  declare readonly paging_token: string;
  declare readonly sponsor?: string;
  declare readonly num_sponsoring: number;
  declare readonly num_sponsored: number;

  constructor(record: AccountRecord) {
    super(record.account_id, record.sequence);
    Object.assign(this, record);
  }
}
