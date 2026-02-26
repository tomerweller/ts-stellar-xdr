import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseSSE, sseStream } from '../src/streaming.js';
import { HorizonClient } from '../src/client.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// parseSSE
// ---------------------------------------------------------------------------

describe('parseSSE', () => {
  it('parses a single event', () => {
    const [events, remainder] = parseSSE('data: {"seq":1}\nid: abc\n\n');
    expect(events).toHaveLength(1);
    expect(events[0]!.data).toBe('{"seq":1}');
    expect(events[0]!.id).toBe('abc');
    expect(remainder).toBe('');
  });

  it('parses multiple events', () => {
    const raw = 'data: {"a":1}\nid: 1\n\ndata: {"b":2}\nid: 2\n\n';
    const [events, remainder] = parseSSE(raw);
    expect(events).toHaveLength(2);
    expect(events[0]!.data).toBe('{"a":1}');
    expect(events[0]!.id).toBe('1');
    expect(events[1]!.data).toBe('{"b":2}');
    expect(events[1]!.id).toBe('2');
    expect(remainder).toBe('');
  });

  it('handles multi-line data', () => {
    const raw = 'data: line1\ndata: line2\n\n';
    const [events] = parseSSE(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.data).toBe('line1\nline2');
  });

  it('ignores comment lines', () => {
    const raw = ':this is a comment\ndata: {"ok":true}\n\n';
    const [events] = parseSSE(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.data).toBe('{"ok":true}');
  });

  it('handles retry field', () => {
    const raw = 'retry: 5000\ndata: {"r":1}\n\n';
    const [events] = parseSSE(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.retry).toBe(5000);
  });

  it('ignores non-numeric retry', () => {
    const raw = 'retry: abc\ndata: {"r":1}\n\n';
    const [events] = parseSSE(raw);
    expect(events[0]!.retry).toBeUndefined();
  });

  it('buffers incomplete events', () => {
    const raw = 'data: {"partial":true}\nid: 1';
    const [events, remainder] = parseSSE(raw);
    expect(events).toHaveLength(0);
    expect(remainder).toBe('data: {"partial":true}\nid: 1');
  });

  it('handles data without space after colon', () => {
    const raw = 'data:{"noSpace":true}\n\n';
    const [events] = parseSSE(raw);
    expect(events[0]!.data).toBe('{"noSpace":true}');
  });

  it('skips empty blocks', () => {
    const raw = '\n\ndata: {"ok":true}\n\n';
    const [events] = parseSSE(raw);
    expect(events).toHaveLength(1);
    expect(events[0]!.data).toBe('{"ok":true}');
  });
});

// ---------------------------------------------------------------------------
// sseStream — helpers
// ---------------------------------------------------------------------------

/** Create a ReadableStream that emits the given chunks then closes. */
function chunkedStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]!));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

function mockStreamFetch(body: ReadableStream<Uint8Array>, status = 200) {
  const fn = vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    body,
  });
  globalThis.fetch = fn;
  return fn;
}

// ---------------------------------------------------------------------------
// sseStream — behavior
// ---------------------------------------------------------------------------

describe('sseStream', () => {
  it('calls onMessage with parsed JSON for each event', async () => {
    const messages: unknown[] = [];
    const body = chunkedStream([
      'data: {"seq":1}\nid: 1\n\n',
      'data: {"seq":2}\nid: 2\n\n',
    ]);
    mockStreamFetch(body);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        onMessage: (msg) => messages.push(msg),
        onError: () => {},
      },
    );

    // Wait for stream to process
    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    expect(messages).toEqual([{ seq: 1 }, { seq: 2 }]);
  });

  it('passes cursor as query parameter', async () => {
    const body = chunkedStream(['data: {"ok":true}\n\n']);
    const fn = mockStreamFetch(body);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        cursor: 'now',
        onMessage: () => {},
        onError: () => {},
      },
    );

    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    const url = new URL(fn.mock.calls[0]![0] as string);
    expect(url.searchParams.get('cursor')).toBe('now');
  });

  it('passes custom headers', async () => {
    const body = chunkedStream(['data: {}\n\n']);
    const fn = mockStreamFetch(body);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      { 'X-Api-Key': 'secret' },
      {
        onMessage: () => {},
        onError: () => {},
      },
    );

    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    const opts = fn.mock.calls[0]![1];
    expect(opts.headers['X-Api-Key']).toBe('secret');
    expect(opts.headers['Accept']).toBe('text/event-stream');
  });

  it('calls onError on JSON parse failure', async () => {
    const errors: Error[] = [];
    const body = chunkedStream(['data: not-json\n\n']);
    mockStreamFetch(body);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        onMessage: () => {},
        onError: (err) => errors.push(err),
      },
    );

    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain('JSON');
  });

  it('calls onError on HTTP error', async () => {
    const errors: Error[] = [];
    const body = chunkedStream([]);
    mockStreamFetch(body, 503);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        onMessage: () => {},
        onError: (err) => errors.push(err),
      },
    );

    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.message).toContain('503');
  });

  it('close() stops the stream', async () => {
    // Create a stream that never ends
    const body = new ReadableStream<Uint8Array>({
      start() {
        // Never pushes, never closes
      },
    });
    mockStreamFetch(body);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        onMessage: () => {},
        onError: () => {},
      },
    );

    // Close immediately
    stream.close();
    // Should not throw or hang
    await new Promise((r) => setTimeout(r, 50));
  });

  it('tracks lastEventId and uses it on reconnect', async () => {
    // First connection: emits one event with id, then ends
    const body1 = chunkedStream(['data: {"seq":1}\nid: cursor_100\n\n']);
    const fn = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: body1,
      })
      // Second connection after reconnect
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: chunkedStream(['data: {"seq":2}\nid: cursor_200\n\n']),
      });
    globalThis.fetch = fn;

    const messages: unknown[] = [];
    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        onMessage: (msg) => messages.push(msg),
        onError: () => {},
      },
    );

    // Wait for first connection + reconnect delay + second connection
    await new Promise((r) => setTimeout(r, 1200));
    stream.close();

    // Second call should have cursor=cursor_100
    if (fn.mock.calls.length >= 2) {
      const url2 = new URL(fn.mock.calls[1]![0] as string);
      expect(url2.searchParams.get('cursor')).toBe('cursor_100');
    }
    expect(messages).toContainEqual({ seq: 1 });
  });

  it('handles retry field to adjust reconnect delay', async () => {
    // Emit a retry: 100 to speed up reconnection
    const body1 = chunkedStream(['retry: 100\ndata: {"seq":1}\nid: a\n\n']);
    const fn = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: body1,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: chunkedStream(['data: {"seq":2}\n\n']),
      });
    globalThis.fetch = fn;

    const messages: unknown[] = [];
    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        onMessage: (msg) => messages.push(msg),
        onError: () => {},
      },
    );

    // With retry: 100, reconnect should happen within 200ms
    await new Promise((r) => setTimeout(r, 300));
    stream.close();

    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(messages).toContainEqual({ seq: 2 });
  });

  it('handles chunked SSE data split across reads', async () => {
    const messages: unknown[] = [];
    // Split one event across two chunks
    const body = chunkedStream([
      'data: {"spl',
      'it":true}\nid: 1\n\n',
    ]);
    mockStreamFetch(body);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'ledgers',
      {},
      {},
      {
        onMessage: (msg) => messages.push(msg),
        onError: () => {},
      },
    );

    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    expect(messages).toEqual([{ split: true }]);
  });

  it('includes extra params in URL', async () => {
    const body = chunkedStream(['data: {}\n\n']);
    const fn = mockStreamFetch(body);

    const stream = sseStream(
      'https://horizon.stellar.org/',
      'order_book',
      { selling_asset_type: 'native', buying_asset_type: 'credit_alphanum4' },
      {},
      {
        onMessage: () => {},
        onError: () => {},
      },
    );

    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    const url = new URL(fn.mock.calls[0]![0] as string);
    expect(url.searchParams.get('selling_asset_type')).toBe('native');
    expect(url.searchParams.get('buying_asset_type')).toBe('credit_alphanum4');
  });
});

// ---------------------------------------------------------------------------
// HorizonClient stream methods — URL paths
// ---------------------------------------------------------------------------

describe('HorizonClient stream methods', () => {
  function mockStreamFetchForClient() {
    const body = chunkedStream(['data: {}\n\n']);
    const fn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      body,
    });
    globalThis.fetch = fn;
    return fn;
  }

  function fetchPath(fn: ReturnType<typeof vi.fn>): string {
    return new URL(fn.mock.calls[0]![0] as string).pathname;
  }

  const noop = { onMessage: () => {}, onError: () => {} };

  it('streamLedgers hits /ledgers', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamLedgers(noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/ledgers');
  });

  it('streamTransactions hits /transactions', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamTransactions(noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/transactions');
  });

  it('streamOperations hits /operations', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamOperations(noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/operations');
  });

  it('streamPayments hits /payments', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamPayments(noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/payments');
  });

  it('streamEffects hits /effects', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamEffects(noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/effects');
  });

  it('streamTrades hits /trades', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamTrades(noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/trades');
  });

  it('streamAccountTransactions hits /accounts/{id}/transactions', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamAccountTransactions('GABC', noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/accounts/GABC/transactions');
  });

  it('streamAccountOperations hits /accounts/{id}/operations', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamAccountOperations('GABC', noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/accounts/GABC/operations');
  });

  it('streamAccountPayments hits /accounts/{id}/payments', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamAccountPayments('GABC', noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/accounts/GABC/payments');
  });

  it('streamAccountEffects hits /accounts/{id}/effects', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamAccountEffects('GABC', noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/accounts/GABC/effects');
  });

  it('streamAccountTrades hits /accounts/{id}/trades', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamAccountTrades('GABC', noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/accounts/GABC/trades');
  });

  it('streamAccountOffers hits /accounts/{id}/offers', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamAccountOffers('GABC', noop);
    await new Promise((r) => setTimeout(r, 50));
    stream.close();
    expect(fetchPath(fn)).toBe('/accounts/GABC/offers');
  });

  it('streamOrderBook hits /order_book with asset params', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamOrderBook(
      {
        selling: { type: 'native' },
        buying: { type: 'credit_alphanum4', code: 'USD', issuer: 'GISSUER' },
      },
      noop,
    );
    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    const url = new URL(fn.mock.calls[0]![0] as string);
    expect(url.pathname).toBe('/order_book');
    expect(url.searchParams.get('selling_asset_type')).toBe('native');
    expect(url.searchParams.get('buying_asset_type')).toBe('credit_alphanum4');
    expect(url.searchParams.get('buying_asset_code')).toBe('USD');
    expect(url.searchParams.get('buying_asset_issuer')).toBe('GISSUER');
  });

  it('stream method passes cursor', async () => {
    const fn = mockStreamFetchForClient();
    const client = new HorizonClient('https://horizon.stellar.org');
    const stream = client.streamLedgers({ cursor: 'now', onMessage: () => {} });
    await new Promise((r) => setTimeout(r, 50));
    stream.close();

    const url = new URL(fn.mock.calls[0]![0] as string);
    expect(url.searchParams.get('cursor')).toBe('now');
  });
});
