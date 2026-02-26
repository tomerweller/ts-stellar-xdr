/**
 * SorobanRpc.Api response types — mirrors the official @stellar/stellar-sdk typings.
 */

export interface GetHealthResponse {
  status: string;
  latestLedger: number;
  oldestLedger: number;
  ledgerRetentionWindow: number;
}

export interface GetNetworkResponse {
  friendbotUrl?: string;
  passphrase: string;
  protocolVersion: number;
}

export interface GetLatestLedgerResponse {
  id: string;
  protocolVersion: number;
  sequence: number;
}

export interface GetAccountResponse {
  id: string;
  sequence: string;
}

export interface SimulateTransactionResponse {
  latestLedger: number;
  cost?: { cpuInsns: string; memBytes: string };
  transactionData?: string;
  minResourceFee?: string;
  events?: string[];
  results?: Array<{ xdr: string }>;
  error?: string;
}

export interface SendTransactionResponse {
  status: string;
  hash: string;
  latestLedger: number;
  latestLedgerCloseTime: string;
  errorResultXdr?: string;
  diagnosticEventsXdr?: string[];
}

export interface GetTransactionResponse {
  status: string;
  latestLedger: number;
  latestLedgerCloseTime: string;
  oldestLedger: number;
  oldestLedgerCloseTime: string;
  ledger?: number;
  createdAt?: string;
  applicationOrder?: number;
  feeBump?: boolean;
  envelopeXdr?: string;
  resultXdr?: string;
  resultMetaXdr?: string;
  returnValue?: any;
}

export interface GetEventsResponse {
  events: EventInfo[];
  latestLedger: number;
}

export interface EventInfo {
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  id: string;
  pagingToken: string;
  topic: string[];
  value: string;
  inSuccessfulContractCall: boolean;
}

export interface GetLedgerEntriesResponse {
  entries: Array<{
    key: string;
    xdr: string;
    lastModifiedLedgerSeq: number;
    liveUntilLedgerSeq?: number;
  }>;
  latestLedger: number;
}
