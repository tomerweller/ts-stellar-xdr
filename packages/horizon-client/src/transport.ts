import { HorizonError, type HorizonErrorBody } from './errors.js';

export async function httpGet<T>(
  baseUrl: string,
  path: string,
  params?: Record<string, string>,
  headers?: Record<string, string>,
): Promise<T> {
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json', ...headers },
  });
  if (!res.ok) {
    let body: HorizonErrorBody | undefined;
    try {
      body = await res.json();
    } catch {
      // body wasn't JSON
    }
    throw new HorizonError(res.status, `HTTP ${res.status}: ${res.statusText}`, body);
  }
  return res.json() as Promise<T>;
}

export async function httpPost<T>(
  baseUrl: string,
  path: string,
  formBody: string,
  headers?: Record<string, string>,
): Promise<T> {
  const url = new URL(path, baseUrl);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...headers,
    },
    body: formBody,
  });
  if (!res.ok) {
    let body: HorizonErrorBody | undefined;
    try {
      body = await res.json();
    } catch {
      // body wasn't JSON
    }
    throw new HorizonError(res.status, `HTTP ${res.status}: ${res.statusText}`, body);
  }
  return res.json() as Promise<T>;
}
