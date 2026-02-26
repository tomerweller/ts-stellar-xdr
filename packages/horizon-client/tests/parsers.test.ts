import { describe, it, expect } from 'vitest';
import { parsePage, stripLinks } from '../src/parsers.js';

describe('parsePage', () => {
  it('extracts records from _embedded', () => {
    const result = parsePage({
      _links: {
        self: { href: 'https://horizon.stellar.org/ledgers' },
      },
      _embedded: {
        records: [{ id: '1' }, { id: '2' }],
      },
    });
    expect(result.records).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('extracts cursor from next link', () => {
    const result = parsePage({
      _links: {
        self: { href: 'https://horizon.stellar.org/ledgers?cursor=abc' },
        next: { href: 'https://horizon.stellar.org/ledgers?cursor=xyz&limit=10&order=asc' },
      },
      _embedded: { records: [] },
    });
    expect(result.next).toBe('xyz');
  });

  it('extracts cursor from prev link', () => {
    const result = parsePage({
      _links: {
        self: { href: 'https://horizon.stellar.org/ledgers' },
        prev: { href: 'https://horizon.stellar.org/ledgers?cursor=abc123&limit=10&order=desc' },
      },
      _embedded: { records: [] },
    });
    expect(result.prev).toBe('abc123');
  });

  it('returns undefined next when no next link', () => {
    const result = parsePage({
      _links: {
        self: { href: 'https://horizon.stellar.org/ledgers' },
      },
      _embedded: { records: [] },
    });
    expect(result.next).toBeUndefined();
  });

  it('returns undefined prev when no prev link', () => {
    const result = parsePage({
      _links: {
        self: { href: 'https://horizon.stellar.org/ledgers' },
      },
      _embedded: { records: [] },
    });
    expect(result.prev).toBeUndefined();
  });

  it('returns undefined cursor when URL has no cursor param', () => {
    const result = parsePage({
      _links: {
        self: { href: 'https://horizon.stellar.org/ledgers' },
        next: { href: 'https://horizon.stellar.org/ledgers?limit=10' },
      },
      _embedded: { records: [] },
    });
    expect(result.next).toBeUndefined();
  });

  it('handles empty records array', () => {
    const result = parsePage({
      _links: {
        self: { href: 'https://horizon.stellar.org/ledgers' },
      },
      _embedded: { records: [] },
    });
    expect(result.records).toEqual([]);
  });
});

describe('stripLinks', () => {
  it('removes _links from record', () => {
    const raw = {
      id: '123',
      account_id: 'GABC',
      _links: { self: { href: '...' } },
    };
    const result = stripLinks(raw);
    expect(result).toEqual({ id: '123', account_id: 'GABC' });
    expect('_links' in result).toBe(false);
  });

  it('preserves all other fields', () => {
    const raw = {
      id: '1',
      hash: 'abc',
      sequence: 42,
      _links: {},
    };
    const result = stripLinks(raw);
    expect(result.id).toBe('1');
    expect(result.hash).toBe('abc');
    expect(result.sequence).toBe(42);
  });

  it('handles record without _links', () => {
    const raw = { id: '1', value: 'test' };
    const result = stripLinks(raw);
    expect(result).toEqual({ id: '1', value: 'test' });
  });
});
