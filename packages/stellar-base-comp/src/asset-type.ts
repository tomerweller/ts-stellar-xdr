/**
 * AssetType — string literal union matching the official @stellar/stellar-base type.
 * Also exported as a namespace so it can be used as SdkAssetType.credit_alphanum4 etc.
 */

export namespace AssetType {
  export type native = 'native';
  export type credit_alphanum4 = 'credit_alphanum4';
  export type credit_alphanum12 = 'credit_alphanum12';
  export type liquidity_pool_shares = 'liquidity_pool_shares';
}

export type AssetType =
  | 'native'
  | 'credit_alphanum4'
  | 'credit_alphanum12'
  | 'liquidity_pool_shares';
