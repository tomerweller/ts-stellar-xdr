import type { Stream, StreamOptions } from './types.js';

const DEFAULT_RETRY_MS = 1000;

/**
 * Parse raw SSE text into individual event blocks.
 * Each block is separated by a blank line (`\n\n`).
 * Returns [parsedEvents, remainingBuffer].
 */
export function parseSSE(raw: string): [Array<{ data: string; id?: string; retry?: number }>, string] {
  const events: Array<{ data: string; id?: string; retry?: number }> = [];
  // Split on double newline (event boundary)
  const parts = raw.split('\n\n');
  // Last part is incomplete (still buffering)
  const remainder = parts.pop()!;

  for (const block of parts) {
    if (!block.trim()) continue;

    let data = '';
    let id: string | undefined;
    let retry: number | undefined;

    for (const line of block.split('\n')) {
      // Lines starting with ':' are comments — skip
      if (line.startsWith(':')) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const field = line.slice(0, colonIdx);
      // Spec says: if char after colon is space, skip it
      const value = line[colonIdx + 1] === ' ' ? line.slice(colonIdx + 2) : line.slice(colonIdx + 1);

      switch (field) {
        case 'data':
          data = data ? data + '\n' + value : value;
          break;
        case 'id':
          id = value;
          break;
        case 'retry': {
          const n = parseInt(value, 10);
          if (!isNaN(n)) retry = n;
          break;
        }
      }
    }

    // Only emit events that have data
    if (data) {
      events.push({ data, id, retry });
    }
  }

  return [events, remainder];
}

/**
 * Open an SSE stream via fetch() and ReadableStream.
 */
export function sseStream<T>(
  baseUrl: string,
  path: string,
  params: Record<string, string>,
  headers: Record<string, string>,
  opts: StreamOptions<T>,
): Stream {
  const controller = new AbortController();
  let closed = false;
  let retryMs = DEFAULT_RETRY_MS;
  let lastEventId = opts.cursor;

  async function connect(): Promise<void> {
    while (!closed) {
      try {
        const url = new URL(path, baseUrl);
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) url.searchParams.set(k, v);
        }
        if (lastEventId) {
          url.searchParams.set('cursor', lastEventId);
        }

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { Accept: 'text/event-stream', ...headers },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`SSE fetch failed: HTTP ${res.status} ${res.statusText}`);
        }

        const body = res.body;
        if (!body) {
          throw new Error('SSE response has no body');
        }

        const reader = body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += value;
          const [events, remainder] = parseSSE(buffer);
          buffer = remainder;

          for (const event of events) {
            if (event.retry !== undefined) {
              retryMs = event.retry;
            }
            if (event.id !== undefined) {
              lastEventId = event.id;
            }
            try {
              const parsed = JSON.parse(event.data) as T;
              opts.onMessage(parsed);
            } catch (err) {
              opts.onError?.(err instanceof Error ? err : new Error(String(err)));
            }
          }
        }
      } catch (err) {
        if (closed) return;
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      }

      // Reconnect after delay unless closed
      if (!closed) {
        await new Promise((resolve) => setTimeout(resolve, retryMs));
      }
    }
  }

  // Start connection in background
  connect();

  return {
    close() {
      closed = true;
      controller.abort();
    },
  };
}
