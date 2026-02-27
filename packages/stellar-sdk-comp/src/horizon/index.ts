export { Server, type ServerOptions } from './server.js';
export {
  CallBuilder,
  AccountCallBuilder,
  LedgerCallBuilder,
  TransactionCallBuilder,
  OperationCallBuilder,
  PaymentCallBuilder,
  EffectCallBuilder,
  OfferCallBuilder,
  TradesCallBuilder,
  AssetsCallBuilder,
  ClaimableBalanceCallBuilder,
  LiquidityPoolCallBuilder,
  OrderbookCallBuilder,
  StrictReceivePathCallBuilder,
  StrictSendPathCallBuilder,
  TradeAggregationCallBuilder,
  OfferTradesCallBuilder,
} from './call-builder.js';
export {
  AccountResponse,
  type CollectionPage,
} from './api.js';
export type * from './api.js';
export { AccountRequiresMemoError } from '@stellar/seps';

// Nested namespace aliases for Freighter compat
export * as HorizonApi from './api.js';
export * as ServerApi from './api.js';
