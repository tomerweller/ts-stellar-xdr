import type { TransactionEnvelope } from '@stellar/xdr';
import { TransactionEnvelope as TransactionEnvelopeCodec } from '@stellar/xdr';
import { HorizonError } from './errors.js';
import { httpGet, httpPost } from './transport.js';
import { assetParams, assetString, assetList } from './assets.js';
import type { AssetId } from './assets.js';
import { parsePage, stripLinks, type HalCollection } from './parsers.js';
import { sseStream } from './streaming.js';
import type {
  PageParams,
  Page,
  Stream,
  StreamOptions,
  RootResponse,
  FeeStatsResponse,
  AccountRecord,
  AccountDataRecord,
  LedgerRecord,
  TransactionRecord,
  OperationRecord,
  EffectRecord,
  OfferRecord,
  TradeRecord,
  AssetRecord,
  ClaimableBalanceRecord,
  LiquidityPoolRecord,
  PathRecord,
  OrderBookResponse,
  TradeAggregationRecord,
  SubmitTransactionResponse,
  SubmitAsyncTransactionResponse,
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

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface HorizonClientOptions {
  allowHttp?: boolean;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function pageToParams(p?: PageParams): Record<string, string> {
  const params: Record<string, string> = {};
  if (p?.cursor) params.cursor = p.cursor;
  if (p?.limit !== undefined) params.limit = String(p.limit);
  if (p?.order) params.order = p.order;
  return params;
}

function boolParam(key: string, value?: boolean): Record<string, string> {
  return value !== undefined ? { [key]: String(value) } : {};
}

// ---------------------------------------------------------------------------
// HorizonClient
// ---------------------------------------------------------------------------

export class HorizonClient {
  readonly url: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, opts?: HorizonClientOptions) {
    if (!opts?.allowHttp && url.startsWith('http://')) {
      throw new HorizonError(
        0,
        'HTTP URLs are not allowed by default. Pass allowHttp: true to enable.',
      );
    }
    this.url = url.endsWith('/') ? url : url + '/';
    this.headers = opts?.headers ?? {};
  }

  private get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return httpGet<T>(this.url, path, params, this.headers);
  }

  private post<T>(path: string, body: string): Promise<T> {
    return httpPost<T>(this.url, path, body, this.headers);
  }

  // -----------------------------------------------------------------------
  // Root / Metadata
  // -----------------------------------------------------------------------

  async root(): Promise<RootResponse> {
    return this.get<RootResponse>('');
  }

  async feeStats(): Promise<FeeStatsResponse> {
    return this.get<FeeStatsResponse>('fee_stats');
  }

  async fetchBaseFee(): Promise<number> {
    const stats = await this.feeStats();
    return parseInt(stats.last_ledger_base_fee, 10) || 100;
  }

  // -----------------------------------------------------------------------
  // Accounts
  // -----------------------------------------------------------------------

  async getAccount(accountId: string): Promise<AccountRecord> {
    const raw = await this.get<AccountRecord & { _links?: unknown }>(`accounts/${accountId}`);
    return stripLinks(raw);
  }

  async getAccountData(accountId: string, key: string): Promise<AccountDataRecord> {
    return this.get<AccountDataRecord>(
      `accounts/${accountId}/data/${encodeURIComponent(key)}`,
    );
  }

  async getAccounts(params?: AccountsParams): Promise<Page<AccountRecord>> {
    return parsePage(
      await this.get<HalCollection<AccountRecord>>('accounts', {
        ...pageToParams(params),
        ...(params?.signer ? { signer: params.signer } : {}),
        ...(params?.asset ? { asset: params.asset } : {}),
        ...(params?.sponsor ? { sponsor: params.sponsor } : {}),
        ...(params?.liquidity_pool ? { liquidity_pool: params.liquidity_pool } : {}),
      }),
    );
  }

  async getAccountTransactions(
    accountId: string,
    params?: TransactionsParams,
  ): Promise<Page<TransactionRecord>> {
    return parsePage(
      await this.get<HalCollection<TransactionRecord>>(
        `accounts/${accountId}/transactions`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getAccountOperations(
    accountId: string,
    params?: OperationsParams,
  ): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>(
        `accounts/${accountId}/operations`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getAccountPayments(
    accountId: string,
    params?: PaymentsParams,
  ): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>(
        `accounts/${accountId}/payments`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getAccountEffects(
    accountId: string,
    params?: EffectsParams,
  ): Promise<Page<EffectRecord>> {
    return parsePage(
      await this.get<HalCollection<EffectRecord>>(
        `accounts/${accountId}/effects`,
        pageToParams(params),
      ),
    );
  }

  async getAccountOffers(
    accountId: string,
    params?: PageParams,
  ): Promise<Page<OfferRecord>> {
    return parsePage(
      await this.get<HalCollection<OfferRecord>>(
        `accounts/${accountId}/offers`,
        pageToParams(params),
      ),
    );
  }

  async getAccountTrades(
    accountId: string,
    params?: PageParams,
  ): Promise<Page<TradeRecord>> {
    return parsePage(
      await this.get<HalCollection<TradeRecord>>(
        `accounts/${accountId}/trades`,
        pageToParams(params),
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Ledgers
  // -----------------------------------------------------------------------

  async getLedger(sequence: number): Promise<LedgerRecord> {
    const raw = await this.get<LedgerRecord & { _links?: unknown }>(`ledgers/${sequence}`);
    return stripLinks(raw);
  }

  async getLedgers(params?: LedgersParams): Promise<Page<LedgerRecord>> {
    return parsePage(
      await this.get<HalCollection<LedgerRecord>>('ledgers', pageToParams(params)),
    );
  }

  async getLedgerTransactions(
    sequence: number,
    params?: TransactionsParams,
  ): Promise<Page<TransactionRecord>> {
    return parsePage(
      await this.get<HalCollection<TransactionRecord>>(
        `ledgers/${sequence}/transactions`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getLedgerOperations(
    sequence: number,
    params?: OperationsParams,
  ): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>(
        `ledgers/${sequence}/operations`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getLedgerEffects(
    sequence: number,
    params?: EffectsParams,
  ): Promise<Page<EffectRecord>> {
    return parsePage(
      await this.get<HalCollection<EffectRecord>>(
        `ledgers/${sequence}/effects`,
        pageToParams(params),
      ),
    );
  }

  async getLedgerPayments(
    sequence: number,
    params?: PaymentsParams,
  ): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>(
        `ledgers/${sequence}/payments`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Transactions
  // -----------------------------------------------------------------------

  async getTransaction(hash: string): Promise<TransactionRecord> {
    const raw = await this.get<TransactionRecord & { _links?: unknown }>(
      `transactions/${hash}`,
    );
    return stripLinks(raw);
  }

  async getTransactions(params?: TransactionsParams): Promise<Page<TransactionRecord>> {
    return parsePage(
      await this.get<HalCollection<TransactionRecord>>('transactions', {
        ...pageToParams(params),
        ...boolParam('include_failed', params?.include_failed),
      }),
    );
  }

  async getTransactionOperations(
    hash: string,
    params?: OperationsParams,
  ): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>(
        `transactions/${hash}/operations`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getTransactionEffects(
    hash: string,
    params?: EffectsParams,
  ): Promise<Page<EffectRecord>> {
    return parsePage(
      await this.get<HalCollection<EffectRecord>>(
        `transactions/${hash}/effects`,
        pageToParams(params),
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Operations
  // -----------------------------------------------------------------------

  async getOperation(id: string): Promise<OperationRecord> {
    const raw = await this.get<OperationRecord & { _links?: unknown }>(`operations/${id}`);
    return stripLinks(raw);
  }

  async getOperations(params?: OperationsParams): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>('operations', {
        ...pageToParams(params),
        ...boolParam('include_failed', params?.include_failed),
      }),
    );
  }

  async getOperationEffects(
    id: string,
    params?: EffectsParams,
  ): Promise<Page<EffectRecord>> {
    return parsePage(
      await this.get<HalCollection<EffectRecord>>(
        `operations/${id}/effects`,
        pageToParams(params),
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  async getEffects(params?: EffectsParams): Promise<Page<EffectRecord>> {
    return parsePage(
      await this.get<HalCollection<EffectRecord>>('effects', pageToParams(params)),
    );
  }

  // -----------------------------------------------------------------------
  // Payments
  // -----------------------------------------------------------------------

  async getPayments(params?: PaymentsParams): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>('payments', {
        ...pageToParams(params),
        ...boolParam('include_failed', params?.include_failed),
      }),
    );
  }

  // -----------------------------------------------------------------------
  // Offers
  // -----------------------------------------------------------------------

  async getOffer(offerId: string): Promise<OfferRecord> {
    const raw = await this.get<OfferRecord & { _links?: unknown }>(`offers/${offerId}`);
    return stripLinks(raw);
  }

  async getOffers(params?: OffersParams): Promise<Page<OfferRecord>> {
    const queryParams: Record<string, string> = {
      ...pageToParams(params),
      ...(params?.seller ? { seller: params.seller } : {}),
      ...(params?.sponsor ? { sponsor: params.sponsor } : {}),
      ...(params?.selling ? assetParams('selling', params.selling) : {}),
      ...(params?.buying ? assetParams('buying', params.buying) : {}),
    };
    return parsePage(
      await this.get<HalCollection<OfferRecord>>('offers', queryParams),
    );
  }

  async getOfferTrades(
    offerId: string,
    params?: PageParams,
  ): Promise<Page<TradeRecord>> {
    return parsePage(
      await this.get<HalCollection<TradeRecord>>(
        `offers/${offerId}/trades`,
        pageToParams(params),
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Trades
  // -----------------------------------------------------------------------

  async getTrades(params?: TradesParams): Promise<Page<TradeRecord>> {
    const queryParams: Record<string, string> = {
      ...pageToParams(params),
      ...(params?.offer_id ? { offer_id: params.offer_id } : {}),
      ...(params?.trade_type ? { trade_type: params.trade_type } : {}),
      ...(params?.base_asset ? assetParams('base', params.base_asset) : {}),
      ...(params?.counter_asset ? assetParams('counter', params.counter_asset) : {}),
    };
    return parsePage(
      await this.get<HalCollection<TradeRecord>>('trades', queryParams),
    );
  }

  // -----------------------------------------------------------------------
  // Assets
  // -----------------------------------------------------------------------

  async getAssets(params?: AssetsParams): Promise<Page<AssetRecord>> {
    return parsePage(
      await this.get<HalCollection<AssetRecord>>('assets', {
        ...pageToParams(params),
        ...(params?.asset_code ? { asset_code: params.asset_code } : {}),
        ...(params?.asset_issuer ? { asset_issuer: params.asset_issuer } : {}),
      }),
    );
  }

  // -----------------------------------------------------------------------
  // Claimable Balances
  // -----------------------------------------------------------------------

  async getClaimableBalance(balanceId: string): Promise<ClaimableBalanceRecord> {
    const raw = await this.get<ClaimableBalanceRecord & { _links?: unknown }>(
      `claimable_balances/${balanceId}`,
    );
    return stripLinks(raw);
  }

  async getClaimableBalances(
    params?: ClaimableBalancesParams,
  ): Promise<Page<ClaimableBalanceRecord>> {
    return parsePage(
      await this.get<HalCollection<ClaimableBalanceRecord>>('claimable_balances', {
        ...pageToParams(params),
        ...(params?.sponsor ? { sponsor: params.sponsor } : {}),
        ...(params?.claimant ? { claimant: params.claimant } : {}),
        ...(params?.asset ? { asset: params.asset } : {}),
      }),
    );
  }

  // -----------------------------------------------------------------------
  // Liquidity Pools
  // -----------------------------------------------------------------------

  async getLiquidityPool(poolId: string): Promise<LiquidityPoolRecord> {
    const raw = await this.get<LiquidityPoolRecord & { _links?: unknown }>(
      `liquidity_pools/${poolId}`,
    );
    return stripLinks(raw);
  }

  async getLiquidityPools(
    params?: LiquidityPoolsParams,
  ): Promise<Page<LiquidityPoolRecord>> {
    return parsePage(
      await this.get<HalCollection<LiquidityPoolRecord>>('liquidity_pools', {
        ...pageToParams(params),
        ...(params?.reserves ? { reserves: params.reserves } : {}),
        ...(params?.account ? { account: params.account } : {}),
      }),
    );
  }

  async getLiquidityPoolTransactions(
    poolId: string,
    params?: TransactionsParams,
  ): Promise<Page<TransactionRecord>> {
    return parsePage(
      await this.get<HalCollection<TransactionRecord>>(
        `liquidity_pools/${poolId}/transactions`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getLiquidityPoolOperations(
    poolId: string,
    params?: OperationsParams,
  ): Promise<Page<OperationRecord>> {
    return parsePage(
      await this.get<HalCollection<OperationRecord>>(
        `liquidity_pools/${poolId}/operations`,
        {
          ...pageToParams(params),
          ...boolParam('include_failed', params?.include_failed),
        },
      ),
    );
  }

  async getLiquidityPoolEffects(
    poolId: string,
    params?: EffectsParams,
  ): Promise<Page<EffectRecord>> {
    return parsePage(
      await this.get<HalCollection<EffectRecord>>(
        `liquidity_pools/${poolId}/effects`,
        pageToParams(params),
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Order Book
  // -----------------------------------------------------------------------

  async getOrderBook(params: OrderBookParams): Promise<OrderBookResponse> {
    return this.get<OrderBookResponse>('order_book', {
      ...assetParams('selling', params.selling),
      ...assetParams('buying', params.buying),
      ...(params.limit !== undefined ? { limit: String(params.limit) } : {}),
    });
  }

  // -----------------------------------------------------------------------
  // Trade Aggregations
  // -----------------------------------------------------------------------

  async getTradeAggregations(
    params: TradeAggregationsParams,
  ): Promise<Page<TradeAggregationRecord>> {
    return parsePage(
      await this.get<HalCollection<TradeAggregationRecord>>('trade_aggregations', {
        ...pageToParams(params),
        ...assetParams('base', params.base_asset),
        ...assetParams('counter', params.counter_asset),
        start_time: String(params.start_time),
        end_time: String(params.end_time),
        resolution: String(params.resolution),
        ...(params.offset !== undefined ? { offset: String(params.offset) } : {}),
      }),
    );
  }

  // -----------------------------------------------------------------------
  // Path Finding
  // -----------------------------------------------------------------------

  async getStrictReceivePaths(params: StrictReceivePathsParams): Promise<PathRecord[]> {
    const queryParams: Record<string, string> = {
      ...assetParams('destination', params.destination_asset),
      destination_amount: params.destination_amount,
    };
    if (params.source_account) {
      queryParams.source_account = params.source_account;
    }
    if (params.source_assets) {
      queryParams.source_assets = assetList(params.source_assets);
    }
    const raw = await this.get<HalCollection<PathRecord>>(
      'paths/strict-receive',
      queryParams,
    );
    return raw._embedded.records;
  }

  async getStrictSendPaths(params: StrictSendPathsParams): Promise<PathRecord[]> {
    const queryParams: Record<string, string> = {
      ...assetParams('source', params.source_asset),
      source_amount: params.source_amount,
    };
    if (params.destination_account) {
      queryParams.destination_account = params.destination_account;
    }
    if (params.destination_assets) {
      queryParams.destination_assets = assetList(params.destination_assets);
    }
    const raw = await this.get<HalCollection<PathRecord>>(
      'paths/strict-send',
      queryParams,
    );
    return raw._embedded.records;
  }

  // -----------------------------------------------------------------------
  // Transaction Submission
  // -----------------------------------------------------------------------

  async submitTransaction(
    envelope: TransactionEnvelope,
  ): Promise<SubmitTransactionResponse> {
    const xdr = TransactionEnvelopeCodec.toBase64(envelope);
    return this.post<SubmitTransactionResponse>(
      'transactions',
      `tx=${encodeURIComponent(xdr)}`,
    );
  }

  async submitAsyncTransaction(
    envelope: TransactionEnvelope,
  ): Promise<SubmitAsyncTransactionResponse> {
    const xdr = TransactionEnvelopeCodec.toBase64(envelope);
    return this.post<SubmitAsyncTransactionResponse>(
      'transactions_async',
      `tx=${encodeURIComponent(xdr)}`,
    );
  }

  // -----------------------------------------------------------------------
  // Streaming (SSE)
  // -----------------------------------------------------------------------

  private openStream<T>(
    path: string,
    params: Record<string, string>,
    opts: StreamOptions<T>,
  ): Stream {
    return sseStream(this.url, path, params, this.headers, opts);
  }

  streamLedgers(opts: StreamOptions<LedgerRecord>): Stream {
    return this.openStream('ledgers', {}, opts);
  }

  streamTransactions(opts: StreamOptions<TransactionRecord>): Stream {
    return this.openStream('transactions', {}, opts);
  }

  streamOperations(opts: StreamOptions<OperationRecord>): Stream {
    return this.openStream('operations', {}, opts);
  }

  streamPayments(opts: StreamOptions<OperationRecord>): Stream {
    return this.openStream('payments', {}, opts);
  }

  streamEffects(opts: StreamOptions<EffectRecord>): Stream {
    return this.openStream('effects', {}, opts);
  }

  streamTrades(opts: StreamOptions<TradeRecord>): Stream {
    return this.openStream('trades', {}, opts);
  }

  streamAccountTransactions(
    accountId: string,
    opts: StreamOptions<TransactionRecord>,
  ): Stream {
    return this.openStream(`accounts/${accountId}/transactions`, {}, opts);
  }

  streamAccountOperations(
    accountId: string,
    opts: StreamOptions<OperationRecord>,
  ): Stream {
    return this.openStream(`accounts/${accountId}/operations`, {}, opts);
  }

  streamAccountPayments(
    accountId: string,
    opts: StreamOptions<OperationRecord>,
  ): Stream {
    return this.openStream(`accounts/${accountId}/payments`, {}, opts);
  }

  streamAccountEffects(
    accountId: string,
    opts: StreamOptions<EffectRecord>,
  ): Stream {
    return this.openStream(`accounts/${accountId}/effects`, {}, opts);
  }

  streamAccountTrades(
    accountId: string,
    opts: StreamOptions<TradeRecord>,
  ): Stream {
    return this.openStream(`accounts/${accountId}/trades`, {}, opts);
  }

  streamAccountOffers(
    accountId: string,
    opts: StreamOptions<OfferRecord>,
  ): Stream {
    return this.openStream(`accounts/${accountId}/offers`, {}, opts);
  }

  streamOrderBook(
    params: { selling: AssetId; buying: AssetId },
    opts: StreamOptions<OrderBookResponse>,
  ): Stream {
    return this.openStream('order_book', {
      ...assetParams('selling', params.selling),
      ...assetParams('buying', params.buying),
    }, opts);
  }
}
