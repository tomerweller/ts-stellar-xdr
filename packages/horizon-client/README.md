# @stellar/horizon-client

REST client for Stellar's Horizon API. Typed responses, cursor-based pagination, and asset query helpers. Depends on `@stellar/xdr`.

## Installation

```bash
npm install @stellar/horizon-client
```

## Quick Start

```typescript
import { HorizonClient, native, credit } from '@stellar/horizon-client';

const horizon = new HorizonClient('https://horizon.stellar.org');

// Server info
const root = await horizon.root();
console.log(root.network_passphrase);

// Fetch an account
const account = await horizon.getAccount('G...');
console.log(account.balances);

// List recent ledgers
const ledgers = await horizon.getLedgers({ limit: 5, order: 'desc' });
for (const ledger of ledgers.records) {
  console.log(ledger.sequence, ledger.closed_at);
}

// Paginate with cursors
const page1 = await horizon.getTransactions({ limit: 10 });
const page2 = await horizon.getTransactions({ cursor: page1.next, limit: 10 });

// Query offers by asset pair
const offers = await horizon.getOffers({
  selling: native(),
  buying: credit('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'),
});

// Submit a transaction
const result = await horizon.submitTransaction(envelope);
```

## `HorizonClient`

### Construction

```typescript
const horizon = new HorizonClient(url: string, opts?: HorizonClientOptions);
```

**Options:**
- `allowHttp?: boolean` — Allow non-HTTPS URLs (default: `false`, throws `HorizonError` for HTTP)
- `headers?: Record<string, string>` — Custom headers for every request

### Methods

#### Root / Metadata

| Method | Signature | Endpoint |
|---|---|---|
| `root()` | `() => Promise<RootResponse>` | `GET /` |
| `feeStats()` | `() => Promise<FeeStatsResponse>` | `GET /fee_stats` |
| `fetchBaseFee()` | `() => Promise<number>` | convenience (returns stroops) |

#### Accounts

| Method | Endpoint |
|---|---|
| `getAccount(id)` | `GET /accounts/{id}` |
| `getAccountData(id, key)` | `GET /accounts/{id}/data/{key}` |
| `getAccounts(params?)` | `GET /accounts` |
| `getAccountTransactions(id, params?)` | `GET /accounts/{id}/transactions` |
| `getAccountOperations(id, params?)` | `GET /accounts/{id}/operations` |
| `getAccountPayments(id, params?)` | `GET /accounts/{id}/payments` |
| `getAccountEffects(id, params?)` | `GET /accounts/{id}/effects` |
| `getAccountOffers(id, params?)` | `GET /accounts/{id}/offers` |
| `getAccountTrades(id, params?)` | `GET /accounts/{id}/trades` |

**`AccountsParams`** filters: `signer`, `asset` (`"CODE:ISSUER"` or `"native"`), `sponsor`, `liquidity_pool`.

#### Ledgers

| Method | Endpoint |
|---|---|
| `getLedger(sequence)` | `GET /ledgers/{sequence}` |
| `getLedgers(params?)` | `GET /ledgers` |
| `getLedgerTransactions(sequence, params?)` | `GET /ledgers/{sequence}/transactions` |
| `getLedgerOperations(sequence, params?)` | `GET /ledgers/{sequence}/operations` |
| `getLedgerEffects(sequence, params?)` | `GET /ledgers/{sequence}/effects` |
| `getLedgerPayments(sequence, params?)` | `GET /ledgers/{sequence}/payments` |

#### Transactions

| Method | Endpoint |
|---|---|
| `getTransaction(hash)` | `GET /transactions/{hash}` |
| `getTransactions(params?)` | `GET /transactions` |
| `getTransactionOperations(hash, params?)` | `GET /transactions/{hash}/operations` |
| `getTransactionEffects(hash, params?)` | `GET /transactions/{hash}/effects` |

**`TransactionsParams`** filters: `include_failed`.

#### Operations

| Method | Endpoint |
|---|---|
| `getOperation(id)` | `GET /operations/{id}` |
| `getOperations(params?)` | `GET /operations` |
| `getOperationEffects(id, params?)` | `GET /operations/{id}/effects` |

#### Effects & Payments

| Method | Endpoint |
|---|---|
| `getEffects(params?)` | `GET /effects` |
| `getPayments(params?)` | `GET /payments` |

#### Offers

| Method | Endpoint |
|---|---|
| `getOffer(id)` | `GET /offers/{id}` |
| `getOffers(params?)` | `GET /offers` |
| `getOfferTrades(id, params?)` | `GET /offers/{id}/trades` |

**`OffersParams`** filters: `seller`, `selling` (AssetId), `buying` (AssetId), `sponsor`.

#### Trades

| Method | Endpoint |
|---|---|
| `getTrades(params?)` | `GET /trades` |

**`TradesParams`** filters: `base_asset` (AssetId), `counter_asset` (AssetId), `offer_id`, `trade_type`.

#### Assets

| Method | Endpoint |
|---|---|
| `getAssets(params?)` | `GET /assets` |

**`AssetsParams`** filters: `asset_code`, `asset_issuer`.

#### Claimable Balances

| Method | Endpoint |
|---|---|
| `getClaimableBalance(id)` | `GET /claimable_balances/{id}` |
| `getClaimableBalances(params?)` | `GET /claimable_balances` |

**`ClaimableBalancesParams`** filters: `sponsor`, `claimant`, `asset`.

#### Liquidity Pools

| Method | Endpoint |
|---|---|
| `getLiquidityPool(id)` | `GET /liquidity_pools/{id}` |
| `getLiquidityPools(params?)` | `GET /liquidity_pools` |
| `getLiquidityPoolTransactions(id, params?)` | `GET /liquidity_pools/{id}/transactions` |
| `getLiquidityPoolOperations(id, params?)` | `GET /liquidity_pools/{id}/operations` |
| `getLiquidityPoolEffects(id, params?)` | `GET /liquidity_pools/{id}/effects` |

#### Order Book

| Method | Endpoint |
|---|---|
| `getOrderBook(params)` | `GET /order_book` |

**`OrderBookParams`**: `selling` (AssetId), `buying` (AssetId), `limit?`.

#### Trade Aggregations

| Method | Endpoint |
|---|---|
| `getTradeAggregations(params)` | `GET /trade_aggregations` |

**`TradeAggregationsParams`**: `base_asset`, `counter_asset`, `start_time`, `end_time`, `resolution` (ms), `offset?`.

#### Path Finding

| Method | Endpoint |
|---|---|
| `getStrictReceivePaths(params)` | `GET /paths/strict-receive` |
| `getStrictSendPaths(params)` | `GET /paths/strict-send` |

Returns `PathRecord[]` (not paginated).

#### Transaction Submission

| Method | Endpoint |
|---|---|
| `submitTransaction(envelope)` | `POST /transactions` |
| `submitAsyncTransaction(envelope)` | `POST /transactions_async` |

Both accept a `TransactionEnvelope` from `@stellar/xdr`.

## Pagination

All collection methods return `Page<T>`:

```typescript
interface Page<T> {
  records: T[];
  next?: string;  // cursor for next page
  prev?: string;  // cursor for previous page
}
```

Pass cursors back via `PageParams`:

```typescript
interface PageParams {
  cursor?: string;
  limit?: number;       // 1–200
  order?: 'asc' | 'desc';
}
```

Example:

```typescript
const page1 = await horizon.getLedgers({ limit: 10 });
const page2 = await horizon.getLedgers({ cursor: page1.next, limit: 10 });
```

## Asset Helpers

Horizon query params require asset type/code/issuer as separate fields. Use the `AssetId` helpers:

```typescript
import { native, credit } from '@stellar/horizon-client';

native()                       // { type: 'native' }
credit('USDC', 'GA5Z...')     // { type: 'credit_alphanum4', code: 'USDC', issuer: 'GA5Z...' }
credit('LONGASSET', 'GA5Z...') // { type: 'credit_alphanum12', ... }
```

These are used in filter params for offers, trades, order book, paths, and trade aggregations.

## XDR Decoding

Transaction records include XDR fields as base64 strings (`envelope_xdr`, `result_xdr`, `result_meta_xdr`). Decode on demand:

```typescript
import { decodeEnvelopeXdr, decodeResultXdr, decodeResultMetaXdr } from '@stellar/horizon-client';

const tx = await horizon.getTransaction('abc123...');
const envelope = decodeEnvelopeXdr(tx.envelope_xdr);
const result = decodeResultXdr(tx.result_xdr);
const meta = decodeResultMetaXdr(tx.result_meta_xdr);
```

## `HorizonError`

```typescript
import { HorizonError } from '@stellar/horizon-client';

try {
  await horizon.getAccount('GINVALID');
} catch (err) {
  if (err instanceof HorizonError) {
    err.status;  // HTTP status code (e.g. 404)
    err.message; // "HTTP 404: Not Found"
    err.type;    // Horizon error type URL
    err.title;   // "Resource Missing"
    err.detail;  // Human-readable detail
    err.extras;  // Additional context
  }
}
```

## License

Apache-2.0
