import {
  TransactionEnvelope,
  TransactionResult,
  TransactionMeta,
  type TransactionEnvelope as TransactionEnvelopeType,
  type TransactionResult as TransactionResultType,
  type TransactionMeta as TransactionMetaType,
} from '@stellar/xdr';
import type { Page } from './types.js';

// ---------------------------------------------------------------------------
// HAL+JSON raw shapes
// ---------------------------------------------------------------------------

interface HalLink {
  href: string;
  templated?: boolean;
}

export interface HalCollection<T> {
  _links: {
    self: HalLink;
    next?: HalLink;
    prev?: HalLink;
  };
  _embedded: {
    records: T[];
  };
}

// ---------------------------------------------------------------------------
// Cursor extraction
// ---------------------------------------------------------------------------

function extractCursor(link?: HalLink): string | undefined {
  if (!link?.href) return undefined;
  try {
    const url = new URL(link.href);
    return url.searchParams.get('cursor') ?? undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Collection parser
// ---------------------------------------------------------------------------

export function parsePage<T>(raw: HalCollection<T>): Page<T> {
  return {
    records: raw._embedded.records,
    next: extractCursor(raw._links.next),
    prev: extractCursor(raw._links.prev),
  };
}

// ---------------------------------------------------------------------------
// Single-record parser (strip HAL _links)
// ---------------------------------------------------------------------------

export function stripLinks<T>(raw: T & { _links?: unknown }): T {
  const { _links, ...rest } = raw;
  return rest as T;
}

// ---------------------------------------------------------------------------
// XDR decode helpers (on-demand)
// ---------------------------------------------------------------------------

export function decodeEnvelopeXdr(base64: string): TransactionEnvelopeType {
  return TransactionEnvelope.fromBase64(base64);
}

export function decodeResultXdr(base64: string): TransactionResultType {
  return TransactionResult.fromBase64(base64);
}

export function decodeResultMetaXdr(base64: string): TransactionMetaType {
  return TransactionMeta.fromBase64(base64);
}
