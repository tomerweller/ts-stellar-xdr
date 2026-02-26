import { describe, it, expect, vi, afterEach } from 'vitest';
import { HorizonClient } from '../src/client.js';
import { HorizonError } from '../src/errors.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function halCollection<T>(records: T[], nextCursor?: string) {
  return {
    _links: {
      self: { href: 'https://horizon.stellar.org/test' },
      ...(nextCursor
        ? { next: { href: `https://horizon.stellar.org/test?cursor=${nextCursor}&limit=10` } }
        : {}),
    },
    _embedded: { records },
  };
}

function halRecord<T extends Record<string, unknown>>(record: T) {
  return {
    ...record,
    _links: { self: { href: 'https://horizon.stellar.org/test' } },
  };
}

function mockFetch(body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  });
  globalThis.fetch = fn;
  return fn;
}

function fetchUrl(fn: ReturnType<typeof vi.fn>): URL {
  return new URL(fn.mock.calls[0]![0] as string);
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('HorizonClient constructor', () => {
  it('accepts HTTPS URL', () => {
    const client = new HorizonClient('https://horizon.stellar.org');
    expect(client.url).toBe('https://horizon.stellar.org/');
  });

  it('rejects HTTP URL by default', () => {
    expect(() => new HorizonClient('http://localhost:8000')).toThrow(HorizonError);
  });

  it('allows HTTP URL with allowHttp', () => {
    const client = new HorizonClient('http://localhost:8000', { allowHttp: true });
    expect(client.url).toBe('http://localhost:8000/');
  });

  it('normalizes trailing slash', () => {
    const client = new HorizonClient('https://horizon.stellar.org/');
    expect(client.url).toBe('https://horizon.stellar.org/');
  });

  it('adds trailing slash if missing', () => {
    const client = new HorizonClient('https://horizon.stellar.org');
    expect(client.url).toBe('https://horizon.stellar.org/');
  });
});

// ---------------------------------------------------------------------------
// Root / Metadata
// ---------------------------------------------------------------------------

describe('root()', () => {
  it('fetches root endpoint', async () => {
    const fn = mockFetch({
      horizon_version: '2.0',
      network_passphrase: 'Test SDF Network ; September 2015',
    });
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.root();
    expect(result.network_passphrase).toBe('Test SDF Network ; September 2015');
    expect(fetchUrl(fn).pathname).toBe('/');
  });
});

describe('feeStats()', () => {
  it('fetches fee_stats endpoint', async () => {
    const fn = mockFetch({
      last_ledger: '100',
      last_ledger_base_fee: '100',
      fee_charged: { min: '100', max: '200', mode: '100' },
      max_fee: { min: '100', max: '200', mode: '100' },
    });
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.feeStats();
    expect(result.last_ledger).toBe('100');
    expect(fetchUrl(fn).pathname).toBe('/fee_stats');
  });
});

describe('fetchBaseFee()', () => {
  it('returns parsed base fee', async () => {
    mockFetch({
      last_ledger: '100',
      last_ledger_base_fee: '200',
      fee_charged: {},
      max_fee: {},
    });
    const client = new HorizonClient('https://horizon.stellar.org');
    expect(await client.fetchBaseFee()).toBe(200);
  });

  it('defaults to 100 on parse failure', async () => {
    mockFetch({
      last_ledger: '100',
      last_ledger_base_fee: '',
      fee_charged: {},
      max_fee: {},
    });
    const client = new HorizonClient('https://horizon.stellar.org');
    expect(await client.fetchBaseFee()).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

describe('getAccount()', () => {
  it('fetches account and strips _links', async () => {
    const fn = mockFetch(halRecord({ id: 'GABC', account_id: 'GABC', sequence: '42' }));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getAccount('GABC');
    expect(result.account_id).toBe('GABC');
    expect('_links' in result).toBe(false);
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC');
  });
});

describe('getAccountData()', () => {
  it('fetches account data entry', async () => {
    const fn = mockFetch({ value: 'dGVzdA==' });
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getAccountData('GABC', 'mykey');
    expect(result.value).toBe('dGVzdA==');
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/data/mykey');
  });

  it('URL-encodes data key', async () => {
    const fn = mockFetch({ value: '' });
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccountData('GABC', 'key with spaces');
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/data/key%20with%20spaces');
  });
});

describe('getAccounts()', () => {
  it('fetches accounts collection', async () => {
    const fn = mockFetch(halCollection([{ id: 'GA1' }, { id: 'GA2' }], 'cursor123'));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getAccounts({ limit: 2 });
    expect(result.records).toHaveLength(2);
    expect(result.next).toBe('cursor123');
    expect(fetchUrl(fn).searchParams.get('limit')).toBe('2');
  });

  it('passes signer filter', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccounts({ signer: 'GSIGNER' });
    expect(fetchUrl(fn).searchParams.get('signer')).toBe('GSIGNER');
  });

  it('passes asset filter', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccounts({ asset: 'USD:GISSUER' });
    expect(fetchUrl(fn).searchParams.get('asset')).toBe('USD:GISSUER');
  });

  it('passes sponsor filter', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccounts({ sponsor: 'GSPONSOR' });
    expect(fetchUrl(fn).searchParams.get('sponsor')).toBe('GSPONSOR');
  });
});

describe('getAccountTransactions()', () => {
  it('fetches account transactions', async () => {
    const fn = mockFetch(halCollection([{ id: 'tx1' }]));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getAccountTransactions('GABC', { limit: 5 });
    expect(result.records).toHaveLength(1);
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/transactions');
    expect(fetchUrl(fn).searchParams.get('limit')).toBe('5');
  });

  it('passes include_failed', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccountTransactions('GABC', { include_failed: true });
    expect(fetchUrl(fn).searchParams.get('include_failed')).toBe('true');
  });
});

describe('account sub-resources', () => {
  it('getAccountOperations hits correct path', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccountOperations('GABC');
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/operations');
  });

  it('getAccountPayments hits correct path', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccountPayments('GABC');
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/payments');
  });

  it('getAccountEffects hits correct path', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccountEffects('GABC');
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/effects');
  });

  it('getAccountOffers hits correct path', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccountOffers('GABC');
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/offers');
  });

  it('getAccountTrades hits correct path', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAccountTrades('GABC');
    expect(fetchUrl(fn).pathname).toBe('/accounts/GABC/trades');
  });
});

// ---------------------------------------------------------------------------
// Ledgers
// ---------------------------------------------------------------------------

describe('getLedger()', () => {
  it('fetches single ledger', async () => {
    const fn = mockFetch(halRecord({ id: 'L1', sequence: 42 }));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getLedger(42);
    expect(result.sequence).toBe(42);
    expect(fetchUrl(fn).pathname).toBe('/ledgers/42');
  });
});

describe('getLedgers()', () => {
  it('fetches ledger collection with pagination', async () => {
    mockFetch(halCollection([{ sequence: 1 }, { sequence: 2 }], 'next_cursor'));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getLedgers({ limit: 2, order: 'desc' });
    expect(result.records).toHaveLength(2);
    expect(result.next).toBe('next_cursor');
  });

  it('passes cursor param', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLedgers({ cursor: 'abc' });
    expect(fetchUrl(fn).searchParams.get('cursor')).toBe('abc');
  });
});

describe('ledger sub-resources', () => {
  it('getLedgerTransactions', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLedgerTransactions(42);
    expect(fetchUrl(fn).pathname).toBe('/ledgers/42/transactions');
  });

  it('getLedgerOperations', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLedgerOperations(42);
    expect(fetchUrl(fn).pathname).toBe('/ledgers/42/operations');
  });

  it('getLedgerEffects', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLedgerEffects(42);
    expect(fetchUrl(fn).pathname).toBe('/ledgers/42/effects');
  });

  it('getLedgerPayments', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLedgerPayments(42);
    expect(fetchUrl(fn).pathname).toBe('/ledgers/42/payments');
  });
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

describe('getTransaction()', () => {
  it('fetches single transaction', async () => {
    const fn = mockFetch(halRecord({ id: 'txhash', hash: 'txhash', ledger: 100 }));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getTransaction('txhash');
    expect(result.hash).toBe('txhash');
    expect(fetchUrl(fn).pathname).toBe('/transactions/txhash');
  });
});

describe('getTransactions()', () => {
  it('fetches transactions collection', async () => {
    const fn = mockFetch(halCollection([{ hash: 'tx1' }]));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getTransactions({ include_failed: true, limit: 10 });
    expect(result.records).toHaveLength(1);
    expect(fetchUrl(fn).searchParams.get('include_failed')).toBe('true');
    expect(fetchUrl(fn).searchParams.get('limit')).toBe('10');
  });
});

describe('transaction sub-resources', () => {
  it('getTransactionOperations', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getTransactionOperations('txhash');
    expect(fetchUrl(fn).pathname).toBe('/transactions/txhash/operations');
  });

  it('getTransactionEffects', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getTransactionEffects('txhash');
    expect(fetchUrl(fn).pathname).toBe('/transactions/txhash/effects');
  });
});

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

describe('getOperation()', () => {
  it('fetches single operation', async () => {
    const fn = mockFetch(halRecord({ id: '123', type: 'payment' }));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getOperation('123');
    expect(result.type).toBe('payment');
    expect(fetchUrl(fn).pathname).toBe('/operations/123');
  });
});

describe('getOperations()', () => {
  it('fetches operations with include_failed', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getOperations({ include_failed: false });
    expect(fetchUrl(fn).searchParams.get('include_failed')).toBe('false');
  });
});

describe('getOperationEffects()', () => {
  it('hits correct path', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getOperationEffects('123');
    expect(fetchUrl(fn).pathname).toBe('/operations/123/effects');
  });
});

// ---------------------------------------------------------------------------
// Effects & Payments
// ---------------------------------------------------------------------------

describe('getEffects()', () => {
  it('fetches effects', async () => {
    const fn = mockFetch(halCollection([{ id: 'e1', type: 'account_created' }]));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getEffects({ order: 'desc' });
    expect(result.records).toHaveLength(1);
    expect(fetchUrl(fn).searchParams.get('order')).toBe('desc');
  });
});

describe('getPayments()', () => {
  it('fetches payments', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getPayments({ include_failed: true });
    expect(fetchUrl(fn).pathname).toBe('/payments');
    expect(fetchUrl(fn).searchParams.get('include_failed')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

describe('getOffer()', () => {
  it('fetches single offer', async () => {
    const fn = mockFetch(halRecord({ id: '456', seller: 'GSELLER' }));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getOffer('456');
    expect(result.seller).toBe('GSELLER');
    expect(fetchUrl(fn).pathname).toBe('/offers/456');
  });
});

describe('getOffers()', () => {
  it('passes asset filter params', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getOffers({
      selling: { type: 'native' },
      buying: { type: 'credit_alphanum4', code: 'USD', issuer: 'GISSUER' },
    });
    const url = fetchUrl(fn);
    expect(url.searchParams.get('selling_asset_type')).toBe('native');
    expect(url.searchParams.get('buying_asset_type')).toBe('credit_alphanum4');
    expect(url.searchParams.get('buying_asset_code')).toBe('USD');
    expect(url.searchParams.get('buying_asset_issuer')).toBe('GISSUER');
  });

  it('passes seller filter', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getOffers({ seller: 'GSELLER' });
    expect(fetchUrl(fn).searchParams.get('seller')).toBe('GSELLER');
  });
});

describe('getOfferTrades()', () => {
  it('hits correct path', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getOfferTrades('456');
    expect(fetchUrl(fn).pathname).toBe('/offers/456/trades');
  });
});

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

describe('getTrades()', () => {
  it('passes asset filters', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getTrades({
      base_asset: { type: 'native' },
      counter_asset: { type: 'credit_alphanum4', code: 'USD', issuer: 'GI' },
    });
    const url = fetchUrl(fn);
    expect(url.searchParams.get('base_asset_type')).toBe('native');
    expect(url.searchParams.get('counter_asset_code')).toBe('USD');
  });

  it('passes trade_type filter', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getTrades({ trade_type: 'liquidity_pool' });
    expect(fetchUrl(fn).searchParams.get('trade_type')).toBe('liquidity_pool');
  });
});

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

describe('getAssets()', () => {
  it('passes asset_code and asset_issuer', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getAssets({ asset_code: 'USD', asset_issuer: 'GISSUER' });
    const url = fetchUrl(fn);
    expect(url.searchParams.get('asset_code')).toBe('USD');
    expect(url.searchParams.get('asset_issuer')).toBe('GISSUER');
  });
});

// ---------------------------------------------------------------------------
// Claimable Balances
// ---------------------------------------------------------------------------

describe('getClaimableBalance()', () => {
  it('fetches single claimable balance', async () => {
    const fn = mockFetch(halRecord({ id: 'cb1', amount: '100.0' }));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getClaimableBalance('cb1');
    expect(result.amount).toBe('100.0');
    expect(fetchUrl(fn).pathname).toBe('/claimable_balances/cb1');
  });
});

describe('getClaimableBalances()', () => {
  it('passes filters', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getClaimableBalances({ claimant: 'GCLAIM', asset: 'native' });
    const url = fetchUrl(fn);
    expect(url.searchParams.get('claimant')).toBe('GCLAIM');
    expect(url.searchParams.get('asset')).toBe('native');
  });
});

// ---------------------------------------------------------------------------
// Liquidity Pools
// ---------------------------------------------------------------------------

describe('getLiquidityPool()', () => {
  it('fetches single liquidity pool', async () => {
    const fn = mockFetch(halRecord({ id: 'pool1', fee_bp: 30 }));
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getLiquidityPool('pool1');
    expect(result.fee_bp).toBe(30);
    expect(fetchUrl(fn).pathname).toBe('/liquidity_pools/pool1');
  });
});

describe('getLiquidityPools()', () => {
  it('passes filters', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLiquidityPools({ reserves: 'native,USD:GISSUER', account: 'GABC' });
    const url = fetchUrl(fn);
    expect(url.searchParams.get('reserves')).toBe('native,USD:GISSUER');
    expect(url.searchParams.get('account')).toBe('GABC');
  });
});

describe('liquidity pool sub-resources', () => {
  it('getLiquidityPoolTransactions', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLiquidityPoolTransactions('pool1');
    expect(fetchUrl(fn).pathname).toBe('/liquidity_pools/pool1/transactions');
  });

  it('getLiquidityPoolOperations', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLiquidityPoolOperations('pool1');
    expect(fetchUrl(fn).pathname).toBe('/liquidity_pools/pool1/operations');
  });

  it('getLiquidityPoolEffects', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getLiquidityPoolEffects('pool1');
    expect(fetchUrl(fn).pathname).toBe('/liquidity_pools/pool1/effects');
  });
});

// ---------------------------------------------------------------------------
// Order Book
// ---------------------------------------------------------------------------

describe('getOrderBook()', () => {
  it('passes asset params and limit', async () => {
    const fn = mockFetch({ bids: [], asks: [], base: {}, counter: {} });
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getOrderBook({
      selling: { type: 'native' },
      buying: { type: 'credit_alphanum4', code: 'USD', issuer: 'GI' },
      limit: 20,
    });
    const url = fetchUrl(fn);
    expect(url.pathname).toBe('/order_book');
    expect(url.searchParams.get('selling_asset_type')).toBe('native');
    expect(url.searchParams.get('buying_asset_code')).toBe('USD');
    expect(url.searchParams.get('limit')).toBe('20');
  });
});

// ---------------------------------------------------------------------------
// Trade Aggregations
// ---------------------------------------------------------------------------

describe('getTradeAggregations()', () => {
  it('passes all required params', async () => {
    const fn = mockFetch(halCollection([]));
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getTradeAggregations({
      base_asset: { type: 'native' },
      counter_asset: { type: 'credit_alphanum4', code: 'USD', issuer: 'GI' },
      start_time: 1000000,
      end_time: 2000000,
      resolution: 3600000,
      offset: 0,
    });
    const url = fetchUrl(fn);
    expect(url.pathname).toBe('/trade_aggregations');
    expect(url.searchParams.get('base_asset_type')).toBe('native');
    expect(url.searchParams.get('counter_asset_code')).toBe('USD');
    expect(url.searchParams.get('start_time')).toBe('1000000');
    expect(url.searchParams.get('end_time')).toBe('2000000');
    expect(url.searchParams.get('resolution')).toBe('3600000');
    expect(url.searchParams.get('offset')).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// Path Finding
// ---------------------------------------------------------------------------

describe('getStrictReceivePaths()', () => {
  it('passes destination asset and source_account', async () => {
    const fn = mockFetch({
      _embedded: {
        records: [{ source_amount: '10', destination_amount: '5', path: [] }],
      },
    });
    const client = new HorizonClient('https://horizon.stellar.org');
    const result = await client.getStrictReceivePaths({
      source_account: 'GSOURCE',
      destination_asset: { type: 'native' },
      destination_amount: '100',
    });
    expect(result).toHaveLength(1);
    const url = fetchUrl(fn);
    expect(url.pathname).toBe('/paths/strict-receive');
    expect(url.searchParams.get('source_account')).toBe('GSOURCE');
    expect(url.searchParams.get('destination_asset_type')).toBe('native');
    expect(url.searchParams.get('destination_amount')).toBe('100');
  });

  it('passes source_assets list', async () => {
    const fn = mockFetch({ _embedded: { records: [] } });
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getStrictReceivePaths({
      source_assets: [
        { type: 'native' },
        { type: 'credit_alphanum4', code: 'USD', issuer: 'GI' },
      ],
      destination_asset: { type: 'native' },
      destination_amount: '50',
    });
    const url = fetchUrl(fn);
    expect(url.searchParams.get('source_assets')).toBe('native,USD:GI');
  });
});

describe('getStrictSendPaths()', () => {
  it('passes source asset and destination_account', async () => {
    const fn = mockFetch({ _embedded: { records: [] } });
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getStrictSendPaths({
      source_asset: { type: 'native' },
      source_amount: '100',
      destination_account: 'GDEST',
    });
    const url = fetchUrl(fn);
    expect(url.pathname).toBe('/paths/strict-send');
    expect(url.searchParams.get('source_asset_type')).toBe('native');
    expect(url.searchParams.get('source_amount')).toBe('100');
    expect(url.searchParams.get('destination_account')).toBe('GDEST');
  });

  it('passes destination_assets list', async () => {
    const fn = mockFetch({ _embedded: { records: [] } });
    const client = new HorizonClient('https://horizon.stellar.org');
    await client.getStrictSendPaths({
      source_asset: { type: 'native' },
      source_amount: '100',
      destination_assets: [
        { type: 'credit_alphanum4', code: 'EUR', issuer: 'GI' },
      ],
    });
    const url = fetchUrl(fn);
    expect(url.searchParams.get('destination_assets')).toBe('EUR:GI');
  });
});

// ---------------------------------------------------------------------------
// Transaction Submission
// ---------------------------------------------------------------------------

describe('submitTransaction()', () => {
  it('posts to /transactions with encoded XDR', async () => {
    const fn = mockFetch({ hash: 'txhash', ledger: 100, successful: true });
    const client = new HorizonClient('https://horizon.stellar.org');

    // Minimal v1 transaction envelope
    const { TransactionEnvelope } = await import('@stellar/xdr');
    const minimalEnvelope = TransactionEnvelope.fromBase64(
      // Use a minimal valid base64 that represents a TransactionEnvelope
      'AAAAAGL8HQvQkbK2HA3WVjRrKmjX00fG8sLI7m0ERwJW/AX3AAAAZAABY0gAAAAIAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAArqN6LeOagjxMaUP96Bzfs9e0corNZXzBWJkFoK7kvkwAAAAAO5rKAAAAAAAAAAABVvwF9wAAAEDzfR5PgRFim5Wcu+ZJ5X1e5lorrnWiRevXsb8s0lfuGuEhikjCzCUGNunvbnIMLkMKEuZYOr1pMhFh/wBSm2oJ',
    );

    const result = await client.submitTransaction(minimalEnvelope);
    expect(result.hash).toBe('txhash');

    const url = fetchUrl(fn);
    expect(url.pathname).toBe('/transactions');

    const opts = fn.mock.calls[0]![1];
    expect(opts.method).toBe('POST');
    expect(opts.body).toContain('tx=');
  });
});

describe('submitAsyncTransaction()', () => {
  it('posts to /transactions_async', async () => {
    const fn = mockFetch({ hash: 'txhash', tx_status: 'PENDING' });
    const client = new HorizonClient('https://horizon.stellar.org');

    const { TransactionEnvelope } = await import('@stellar/xdr');
    const minimalEnvelope = TransactionEnvelope.fromBase64(
      'AAAAAGL8HQvQkbK2HA3WVjRrKmjX00fG8sLI7m0ERwJW/AX3AAAAZAABY0gAAAAIAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAArqN6LeOagjxMaUP96Bzfs9e0corNZXzBWJkFoK7kvkwAAAAAO5rKAAAAAAAAAAABVvwF9wAAAEDzfR5PgRFim5Wcu+ZJ5X1e5lorrnWiRevXsb8s0lfuGuEhikjCzCUGNunvbnIMLkMKEuZYOr1pMhFh/wBSm2oJ',
    );

    const result = await client.submitAsyncTransaction(minimalEnvelope);
    expect(result.tx_status).toBe('PENDING');
    expect(fetchUrl(fn).pathname).toBe('/transactions_async');
  });
});

// ---------------------------------------------------------------------------
// Custom headers
// ---------------------------------------------------------------------------

describe('custom headers', () => {
  it('passes custom headers to all requests', async () => {
    const fn = mockFetch({ horizon_version: '2.0' });
    const client = new HorizonClient('https://horizon.stellar.org', {
      headers: { 'X-Api-Key': 'my-key' },
    });
    await client.root();
    const opts = fn.mock.calls[0]![1];
    expect(opts.headers['X-Api-Key']).toBe('my-key');
  });
});

// ---------------------------------------------------------------------------
// Pagination round-trip
// ---------------------------------------------------------------------------

describe('pagination', () => {
  it('cursor from first page can be used for next page', async () => {
    const fn = mockFetch(halCollection([{ sequence: 3 }], 'page2_cursor'));
    const client = new HorizonClient('https://horizon.stellar.org');
    const page1 = await client.getLedgers({ limit: 1 });
    expect(page1.next).toBe('page2_cursor');

    // Use cursor for next page
    mockFetch(halCollection([{ sequence: 4 }]));
    const page2 = await client.getLedgers({ cursor: page1.next, limit: 1 });
    expect(page2.records).toHaveLength(1);
  });
});
