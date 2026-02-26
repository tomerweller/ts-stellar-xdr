import { describe, it, expect, vi, afterEach } from 'vitest';
import { httpGet, httpPost } from '../src/transport.js';
import { HorizonError } from '../src/errors.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(body: unknown, status = 200, statusText = 'OK') {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
  });
  globalThis.fetch = fn;
  return fn;
}

describe('httpGet', () => {
  it('constructs correct URL with path', async () => {
    const fn = mockFetch({ hello: 'world' });
    await httpGet('https://horizon.example.org/', 'ledgers', undefined, undefined);
    const url = fn.mock.calls[0]![0] as string;
    expect(url).toBe('https://horizon.example.org/ledgers');
  });

  it('appends query params', async () => {
    const fn = mockFetch({ ok: true });
    await httpGet('https://horizon.example.org/', 'accounts', {
      signer: 'GABC',
      limit: '10',
    });
    const url = new URL(fn.mock.calls[0]![0] as string);
    expect(url.searchParams.get('signer')).toBe('GABC');
    expect(url.searchParams.get('limit')).toBe('10');
  });

  it('sends Accept header', async () => {
    const fn = mockFetch({});
    await httpGet('https://horizon.example.org/', '');
    const opts = fn.mock.calls[0]![1];
    expect(opts.headers.Accept).toBe('application/json');
  });

  it('merges custom headers', async () => {
    const fn = mockFetch({});
    await httpGet('https://horizon.example.org/', '', undefined, {
      'X-Api-Key': 'secret',
    });
    const opts = fn.mock.calls[0]![1];
    expect(opts.headers['X-Api-Key']).toBe('secret');
  });

  it('returns parsed JSON body', async () => {
    mockFetch({ records: [1, 2, 3] });
    const result = await httpGet<{ records: number[] }>('https://horizon.example.org/', 'data');
    expect(result.records).toEqual([1, 2, 3]);
  });

  it('throws HorizonError on non-200 status', async () => {
    mockFetch(
      { type: 'https://stellar.org/error', title: 'Not Found', detail: 'gone' },
      404,
      'Not Found',
    );
    await expect(httpGet('https://horizon.example.org/', 'missing')).rejects.toThrow(
      HorizonError,
    );
  });

  it('includes error body fields in HorizonError', async () => {
    mockFetch(
      {
        type: 'https://stellar.org/error',
        title: 'Bad Request',
        detail: 'invalid param',
        extras: { reason: 'bad' },
      },
      400,
      'Bad Request',
    );
    try {
      await httpGet('https://horizon.example.org/', 'bad');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(HorizonError);
      const he = err as HorizonError;
      expect(he.status).toBe(400);
      expect(he.type).toBe('https://stellar.org/error');
      expect(he.title).toBe('Bad Request');
      expect(he.detail).toBe('invalid param');
      expect(he.extras).toEqual({ reason: 'bad' });
    }
  });

  it('handles non-JSON error body gracefully', async () => {
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });
    globalThis.fetch = fn;
    try {
      await httpGet('https://horizon.example.org/', 'broken');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(HorizonError);
      expect((err as HorizonError).status).toBe(500);
    }
  });
});

describe('httpPost', () => {
  it('sends POST with form body', async () => {
    const fn = mockFetch({ hash: 'abc' });
    await httpPost('https://horizon.example.org/', 'transactions', 'tx=AAAA');
    const opts = fn.mock.calls[0]![1];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe('tx=AAAA');
  });

  it('sets Content-Type to form-urlencoded', async () => {
    const fn = mockFetch({ hash: 'abc' });
    await httpPost('https://horizon.example.org/', 'transactions', 'tx=AAAA');
    const opts = fn.mock.calls[0]![1];
    expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('returns parsed response', async () => {
    mockFetch({ hash: 'abc', ledger: 42 });
    const result = await httpPost<{ hash: string; ledger: number }>(
      'https://horizon.example.org/',
      'transactions',
      'tx=AAAA',
    );
    expect(result.hash).toBe('abc');
    expect(result.ledger).toBe(42);
  });

  it('throws HorizonError on failure', async () => {
    mockFetch({ title: 'Transaction Failed' }, 400, 'Bad Request');
    await expect(
      httpPost('https://horizon.example.org/', 'transactions', 'tx=BAD'),
    ).rejects.toThrow(HorizonError);
  });
});
