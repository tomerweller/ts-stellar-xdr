// Client
export { HorizonClient, type HorizonClientOptions } from './client.js';

// Errors
export { HorizonError, type HorizonErrorBody } from './errors.js';

// Asset helpers
export { type AssetId, native, credit, assetParams, assetString, assetList } from './assets.js';

// XDR decode helpers
export { decodeEnvelopeXdr, decodeResultXdr, decodeResultMetaXdr } from './parsers.js';

// Streaming
export { parseSSE, sseStream } from './streaming.js';

// All types
export type {
  // Pagination
  PageParams,
  Page,
  // Streaming
  Stream,
  StreamOptions,
  // Common
  AssetType,
  PriceR,
  Flags,
  AccountThresholds,
  // Records
  RootResponse,
  AccountRecord,
  AccountDataRecord,
  BalanceLine,
  BalanceLineNative,
  BalanceLineAsset,
  BalanceLineLiquidityPool,
  AccountSigner,
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
  FeeStatsResponse,
  FeeDistribution,
  OrderBookResponse,
  OrderBookLevel,
  PathRecord,
  TradeAggregationRecord,
  SubmitTransactionResponse,
  SubmitAsyncTransactionResponse,
  // Param types
  AccountsParams,
  TransactionsParams,
  OperationsParams,
  EffectsParams,
  PaymentsParams,
  LedgersParams,
  OffersParams,
  TradesParams,
  AssetsParams,
  ClaimableBalancesParams,
  LiquidityPoolsParams,
  TradeAggregationsParams,
  StrictReceivePathsParams,
  StrictSendPathsParams,
  OrderBookParams,
} from './types.js';

// Re-export @stellar/xdr for convenience
export * from '@stellar/xdr';
