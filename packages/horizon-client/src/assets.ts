export interface AssetId {
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  code?: string;
  issuer?: string;
}

export function native(): AssetId {
  return { type: 'native' };
}

export function credit(code: string, issuer: string): AssetId {
  const type = code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
  return { type, code, issuer };
}

export function assetParams(prefix: string, asset: AssetId): Record<string, string> {
  const result: Record<string, string> = { [`${prefix}_asset_type`]: asset.type };
  if (asset.code) result[`${prefix}_asset_code`] = asset.code;
  if (asset.issuer) result[`${prefix}_asset_issuer`] = asset.issuer;
  return result;
}

export function assetString(asset: AssetId): string {
  if (asset.type === 'native') return 'native';
  return `${asset.code}:${asset.issuer}`;
}

export function assetList(assets: AssetId[]): string {
  return assets.map(assetString).join(',');
}
