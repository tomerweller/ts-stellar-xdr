/**
 * Generated compat type registrations.
 *
 * Each registration creates a compat class wrapping a modern XDR type
 * with the js-stellar-base class-based API (constructor, getter/setter methods,
 * toXDR/fromXDR, static factories for enums/unions).
 *
 * This file covers the core types used by the compat Transaction/Operation/Asset/Memo API.
 * Additional types can be registered following the same pattern.
 */

import * as modern from '@stellar/xdr';
import {
  createCompatStruct,
  createCompatEnum,
  createCompatUnion,
  identity,
  hyperConverter,
  unsignedHyperConverter,
  optionConverter,
  arrayConverter,
  lazyConverter,
  type Converter,
} from '../xdr-compat/index.js';

// ---------------------------------------------------------------------------
// Primitive converters
// ---------------------------------------------------------------------------

const id = identity<any>();
const int64Conv = hyperConverter();
const uint64Conv = unsignedHyperConverter();

// ---------------------------------------------------------------------------
// Helper: struct converter from a compat class
// ---------------------------------------------------------------------------

function structConverter(CompatClass: any): Converter<any, any> {
  return {
    toCompat: (m: any) => CompatClass._fromModern(m),
    toModern: (c: any) => c._toModern(),
  };
}

function enumConverter(CompatClass: any): Converter<any, any> {
  return {
    toCompat: (m: any) => CompatClass._fromModern(m),
    toModern: (c: any) => c._toModern(),
  };
}

function unionConverter(CompatClass: any): Converter<any, any> {
  return {
    toCompat: (m: any) => CompatClass._fromModern(m),
    toModern: (c: any) => c._toModern(),
  };
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const AssetType = createCompatEnum({
  codec: modern.AssetType,
  members: [
    { compat: 'assetTypeNative', modern: 'Native', value: 0 },
    { compat: 'assetTypeCreditAlphanum4', modern: 'CreditAlphanum4', value: 1 },
    { compat: 'assetTypeCreditAlphanum12', modern: 'CreditAlphanum12', value: 2 },
    { compat: 'assetTypePoolShare', modern: 'PoolShare', value: 3 },
  ],
});

export const MemoType = createCompatEnum({
  codec: modern.MemoType,
  members: [
    { compat: 'memoNone', modern: 'None', value: 0 },
    { compat: 'memoText', modern: 'Text', value: 1 },
    { compat: 'memoId', modern: 'Id', value: 2 },
    { compat: 'memoHash', modern: 'Hash', value: 3 },
    { compat: 'memoReturn', modern: 'Return', value: 4 },
  ],
});

export const OperationType = createCompatEnum({
  codec: modern.OperationType,
  members: [
    { compat: 'createAccount', modern: 'CreateAccount', value: 0 },
    { compat: 'payment', modern: 'Payment', value: 1 },
    { compat: 'pathPaymentStrictReceive', modern: 'PathPaymentStrictReceive', value: 2 },
    { compat: 'manageSellOffer', modern: 'ManageSellOffer', value: 3 },
    { compat: 'createPassiveSellOffer', modern: 'CreatePassiveSellOffer', value: 4 },
    { compat: 'setOptions', modern: 'SetOptions', value: 5 },
    { compat: 'changeTrust', modern: 'ChangeTrust', value: 6 },
    { compat: 'allowTrust', modern: 'AllowTrust', value: 7 },
    { compat: 'accountMerge', modern: 'AccountMerge', value: 8 },
    { compat: 'inflation', modern: 'Inflation', value: 9 },
    { compat: 'manageData', modern: 'ManageData', value: 10 },
    { compat: 'bumpSequence', modern: 'BumpSequence', value: 11 },
    { compat: 'manageBuyOffer', modern: 'ManageBuyOffer', value: 12 },
    { compat: 'pathPaymentStrictSend', modern: 'PathPaymentStrictSend', value: 13 },
    { compat: 'createClaimableBalance', modern: 'CreateClaimableBalance', value: 14 },
    { compat: 'claimClaimableBalance', modern: 'ClaimClaimableBalance', value: 15 },
    { compat: 'beginSponsoringFutureReserves', modern: 'BeginSponsoringFutureReserves', value: 16 },
    { compat: 'endSponsoringFutureReserves', modern: 'EndSponsoringFutureReserves', value: 17 },
    { compat: 'revokeSponsorship', modern: 'RevokeSponsorship', value: 18 },
    { compat: 'clawback', modern: 'Clawback', value: 19 },
    { compat: 'clawbackClaimableBalance', modern: 'ClawbackClaimableBalance', value: 20 },
    { compat: 'setTrustLineFlags', modern: 'SetTrustLineFlags', value: 21 },
    { compat: 'liquidityPoolDeposit', modern: 'LiquidityPoolDeposit', value: 22 },
    { compat: 'liquidityPoolWithdraw', modern: 'LiquidityPoolWithdraw', value: 23 },
    { compat: 'invokeHostFunction', modern: 'InvokeHostFunction', value: 24 },
    { compat: 'extendFootprintTtl', modern: 'ExtendFootprintTtl', value: 25 },
    { compat: 'restoreFootprint', modern: 'RestoreFootprint', value: 26 },
  ],
});

export const PublicKeyType = createCompatEnum({
  codec: modern.PublicKeyType,
  members: [
    { compat: 'publicKeyTypeEd25519', modern: 'PublicKeyTypeEd25519', value: 0 },
  ],
});

export const CryptoKeyType = createCompatEnum({
  codec: modern.CryptoKeyType,
  members: [
    { compat: 'keyTypeEd25519', modern: 'Ed25519', value: 0 },
    { compat: 'keyTypePreAuthTx', modern: 'PreAuthTx', value: 1 },
    { compat: 'keyTypeHashX', modern: 'HashX', value: 2 },
    { compat: 'keyTypeEd25519SignedPayload', modern: 'Ed25519SignedPayload', value: 3 },
    { compat: 'keyTypeMuxedEd25519', modern: 'MuxedEd25519', value: 256 },
  ],
});

export const SignerKeyType = createCompatEnum({
  codec: modern.SignerKeyType,
  members: [
    { compat: 'signerKeyTypeEd25519', modern: 'Ed25519', value: 0 },
    { compat: 'signerKeyTypePreAuthTx', modern: 'PreAuthTx', value: 1 },
    { compat: 'signerKeyTypeHashX', modern: 'HashX', value: 2 },
    { compat: 'signerKeyTypeEd25519SignedPayload', modern: 'Ed25519SignedPayload', value: 3 },
  ],
});

export const EnvelopeType = createCompatEnum({
  codec: modern.EnvelopeType,
  members: [
    { compat: 'envelopeTypeTxV0', modern: 'TxV0', value: 0 },
    { compat: 'envelopeTypeScp', modern: 'Scp', value: 1 },
    { compat: 'envelopeTypeTx', modern: 'Tx', value: 2 },
    { compat: 'envelopeTypeAuth', modern: 'Auth', value: 3 },
    { compat: 'envelopeTypeScpvalue', modern: 'Scpvalue', value: 4 },
    { compat: 'envelopeTypeTxFeeBump', modern: 'TxFeeBump', value: 5 },
    { compat: 'envelopeTypeOpId', modern: 'OpId', value: 6 },
    { compat: 'envelopeTypePoolRevokeOpId', modern: 'PoolRevokeOpId', value: 7 },
    { compat: 'envelopeTypeContractId', modern: 'ContractId', value: 8 },
    { compat: 'envelopeTypeSorobanAuthorization', modern: 'SorobanAuthorization', value: 9 },
  ],
});

export const PreconditionType = createCompatEnum({
  codec: modern.PreconditionType,
  members: [
    { compat: 'precondNone', modern: 'None', value: 0 },
    { compat: 'precondTime', modern: 'Time', value: 1 },
    { compat: 'precondV2', modern: 'V2', value: 2 },
  ],
});

export const ClaimPredicateType = createCompatEnum({
  codec: modern.ClaimPredicateType,
  members: [
    { compat: 'claimPredicateUnconditional', modern: 'Unconditional', value: 0 },
    { compat: 'claimPredicateAnd', modern: 'And', value: 1 },
    { compat: 'claimPredicateOr', modern: 'Or', value: 2 },
    { compat: 'claimPredicateNot', modern: 'Not', value: 3 },
    { compat: 'claimPredicateBeforeAbsoluteTime', modern: 'BeforeAbsoluteTime', value: 4 },
    { compat: 'claimPredicateBeforeRelativeTime', modern: 'BeforeRelativeTime', value: 5 },
  ],
});

export const ClaimantType = createCompatEnum({
  codec: modern.ClaimantType,
  members: [
    { compat: 'claimantTypeV0', modern: 'ClaimantTypeV0', value: 0 },
  ],
});

export const LiquidityPoolType = createCompatEnum({
  codec: modern.LiquidityPoolType,
  members: [
    { compat: 'liquidityPoolConstantProduct', modern: 'LiquidityPoolConstantProduct', value: 0 },
  ],
});

export const ChangeTrustAssetType = createCompatEnum({
  codec: modern.AssetType,
  members: [
    { compat: 'assetTypeNative', modern: 'Native', value: 0 },
    { compat: 'assetTypeCreditAlphanum4', modern: 'CreditAlphanum4', value: 1 },
    { compat: 'assetTypeCreditAlphanum12', modern: 'CreditAlphanum12', value: 2 },
    { compat: 'assetTypePoolShare', modern: 'PoolShare', value: 3 },
  ],
});

export const SCValType = createCompatEnum({
  codec: modern.SCValType,
  members: [
    { compat: 'scvBool', modern: 'Bool', value: 0 },
    { compat: 'scvVoid', modern: 'Void', value: 1 },
    { compat: 'scvError', modern: 'Error', value: 2 },
    { compat: 'scvU32', modern: 'U32', value: 3 },
    { compat: 'scvI32', modern: 'I32', value: 4 },
    { compat: 'scvU64', modern: 'U64', value: 5 },
    { compat: 'scvI64', modern: 'I64', value: 6 },
    { compat: 'scvTimepoint', modern: 'Timepoint', value: 7 },
    { compat: 'scvDuration', modern: 'Duration', value: 8 },
    { compat: 'scvU128', modern: 'U128', value: 9 },
    { compat: 'scvI128', modern: 'I128', value: 10 },
    { compat: 'scvU256', modern: 'U256', value: 11 },
    { compat: 'scvI256', modern: 'I256', value: 12 },
    { compat: 'scvBytes', modern: 'Bytes', value: 13 },
    { compat: 'scvString', modern: 'String', value: 14 },
    { compat: 'scvSymbol', modern: 'Symbol', value: 15 },
    { compat: 'scvVec', modern: 'Vec', value: 16 },
    { compat: 'scvMap', modern: 'Map', value: 17 },
    { compat: 'scvAddress', modern: 'Address', value: 18 },
    { compat: 'scvContractInstance', modern: 'ContractInstance', value: 19 },
    { compat: 'scvLedgerKeyContractInstance', modern: 'LedgerKeyContractInstance', value: 20 },
    { compat: 'scvLedgerKeyNonce', modern: 'LedgerKeyNonce', value: 21 },
  ],
});

export const SCAddressType = createCompatEnum({
  codec: modern.SCAddressType,
  members: [
    { compat: 'scAddressTypeAccount', modern: 'Account', value: 0 },
    { compat: 'scAddressTypeContract', modern: 'Contract', value: 1 },
    { compat: 'scAddressTypeMuxedAccount', modern: 'MuxedAccount', value: 2 },
    { compat: 'scAddressTypeClaimableBalance', modern: 'ClaimableBalance', value: 3 },
    { compat: 'scAddressTypeLiquidityPool', modern: 'LiquidityPool', value: 4 },
  ],
});

export const RevokeSponsorshipType = createCompatEnum({
  codec: modern.RevokeSponsorshipType,
  members: [
    { compat: 'revokeSponsorshipLedgerEntry', modern: 'LedgerEntry', value: 0 },
    { compat: 'revokeSponsorshipSigner', modern: 'Signer', value: 1 },
  ],
});

export const ClaimableBalanceIDType = createCompatEnum({
  codec: modern.ClaimableBalanceIDType,
  members: [
    { compat: 'claimableBalanceIdTypeV0', modern: 'ClaimableBalanceIdTypeV0', value: 0 },
  ],
});

export const HostFunctionType = createCompatEnum({
  codec: modern.HostFunctionType,
  members: [
    { compat: 'hostFunctionTypeInvokeContract', modern: 'InvokeContract', value: 0 },
    { compat: 'hostFunctionTypeCreateContract', modern: 'CreateContract', value: 1 },
    { compat: 'hostFunctionTypeUploadContractWasm', modern: 'UploadContractWasm', value: 2 },
  ],
});

export const ContractIDPreimageType = createCompatEnum({
  codec: modern.ContractIDPreimageType,
  members: [
    { compat: 'contractIdPreimageFromAddress', modern: 'FromAddress', value: 0 },
    { compat: 'contractIdPreimageFromAsset', modern: 'FromAsset', value: 1 },
  ],
});

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

export const AlphaNum4 = createCompatStruct({
  codec: modern.AlphaNum4,
  fields: [
    { name: 'assetCode', convert: id },
    { name: 'issuer', convert: lazyConverter(() => unionConverter(PublicKey)) },
  ],
});

export const AlphaNum12 = createCompatStruct({
  codec: modern.AlphaNum12,
  fields: [
    { name: 'assetCode', convert: id },
    { name: 'issuer', convert: lazyConverter(() => unionConverter(PublicKey)) },
  ],
});

export const Price = createCompatStruct({
  codec: modern.Price,
  fields: [
    { name: 'n', convert: id },
    { name: 'd', convert: id },
  ],
});

export const TimeBounds = createCompatStruct({
  codec: modern.TimeBounds,
  fields: [
    { name: 'minTime', convert: uint64Conv },
    { name: 'maxTime', convert: uint64Conv },
  ],
});

export const LedgerBounds = createCompatStruct({
  codec: modern.LedgerBounds,
  fields: [
    { name: 'minLedger', convert: id },
    { name: 'maxLedger', convert: id },
  ],
});

export const PreconditionsV2 = createCompatStruct({
  codec: modern.PreconditionsV2,
  fields: [
    { name: 'timeBounds', convert: optionConverter(structConverter(TimeBounds)) },
    { name: 'ledgerBounds', convert: optionConverter(structConverter(LedgerBounds)) },
    { name: 'minSeqNum', convert: optionConverter(int64Conv) },
    { name: 'minSeqAge', convert: uint64Conv },
    { name: 'minSeqLedgerGap', convert: id },
    { name: 'extraSigners', convert: lazyConverter(() => arrayConverter(unionConverter(SignerKey))) },
  ],
});

export const DecoratedSignature = createCompatStruct({
  codec: modern.DecoratedSignature,
  fields: [
    { name: 'hint', convert: id },
    { name: 'signature', convert: id },
  ],
});

export const MuxedAccountMed25519 = createCompatStruct({
  codec: modern.MuxedAccountMed25519,
  fields: [
    { name: 'id', convert: uint64Conv },
    { name: 'ed25519', convert: id },
  ],
});

export const CreateAccountOp = createCompatStruct({
  codec: modern.CreateAccountOp,
  fields: [
    { name: 'destination', convert: lazyConverter(() => unionConverter(PublicKey)) },
    { name: 'startingBalance', convert: int64Conv },
  ],
});

export const PaymentOp = createCompatStruct({
  codec: modern.PaymentOp,
  fields: [
    { name: 'destination', convert: lazyConverter(() => unionConverter(MuxedAccount)) },
    { name: 'asset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'amount', convert: int64Conv },
  ],
});

export const PathPaymentStrictReceiveOp = createCompatStruct({
  codec: modern.PathPaymentStrictReceiveOp,
  fields: [
    { name: 'sendAsset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'sendMax', convert: int64Conv },
    { name: 'destination', convert: lazyConverter(() => unionConverter(MuxedAccount)) },
    { name: 'destAsset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'destAmount', convert: int64Conv },
    { name: 'path', convert: lazyConverter(() => arrayConverter(unionConverter(Asset))) },
  ],
});

export const PathPaymentStrictSendOp = createCompatStruct({
  codec: modern.PathPaymentStrictSendOp,
  fields: [
    { name: 'sendAsset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'sendAmount', convert: int64Conv },
    { name: 'destination', convert: lazyConverter(() => unionConverter(MuxedAccount)) },
    { name: 'destAsset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'destMin', convert: int64Conv },
    { name: 'path', convert: lazyConverter(() => arrayConverter(unionConverter(Asset))) },
  ],
});

export const ManageSellOfferOp = createCompatStruct({
  codec: modern.ManageSellOfferOp,
  fields: [
    { name: 'selling', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'buying', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'amount', convert: int64Conv },
    { name: 'price', convert: structConverter(Price) },
    { name: 'offerID', convert: int64Conv },
  ],
});

export const ManageBuyOfferOp = createCompatStruct({
  codec: modern.ManageBuyOfferOp,
  fields: [
    { name: 'selling', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'buying', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'buyAmount', convert: int64Conv },
    { name: 'price', convert: structConverter(Price) },
    { name: 'offerID', convert: int64Conv },
  ],
});

export const CreatePassiveSellOfferOp = createCompatStruct({
  codec: modern.CreatePassiveSellOfferOp,
  fields: [
    { name: 'selling', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'buying', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'amount', convert: int64Conv },
    { name: 'price', convert: structConverter(Price) },
  ],
});

export const Signer = createCompatStruct({
  codec: modern.Signer,
  fields: [
    { name: 'key', convert: lazyConverter(() => unionConverter(SignerKey)) },
    { name: 'weight', convert: id },
  ],
});

export const SetOptionsOp = createCompatStruct({
  codec: modern.SetOptionsOp,
  fields: [
    { name: 'inflationDest', convert: optionConverter(lazyConverter(() => unionConverter(PublicKey))) },
    { name: 'clearFlags', convert: optionConverter(id) },
    { name: 'setFlags', convert: optionConverter(id) },
    { name: 'masterWeight', convert: optionConverter(id) },
    { name: 'lowThreshold', convert: optionConverter(id) },
    { name: 'medThreshold', convert: optionConverter(id) },
    { name: 'highThreshold', convert: optionConverter(id) },
    { name: 'homeDomain', convert: optionConverter(id) },
    { name: 'signer', convert: optionConverter(structConverter(Signer)) },
  ],
});

export const ChangeTrustOp = createCompatStruct({
  codec: modern.ChangeTrustOp,
  fields: [
    { name: 'line', convert: lazyConverter(() => unionConverter(ChangeTrustAsset)) },
    { name: 'limit', convert: int64Conv },
  ],
});

export const AllowTrustOp = createCompatStruct({
  codec: modern.AllowTrustOp,
  fields: [
    { name: 'trustor', convert: lazyConverter(() => unionConverter(PublicKey)) },
    { name: 'asset', convert: id }, // AssetCode union — identity for now
    { name: 'authorize', convert: id },
  ],
});

export const ManageDataOp = createCompatStruct({
  codec: modern.ManageDataOp,
  fields: [
    { name: 'dataName', convert: id },
    { name: 'dataValue', convert: optionConverter(id) },
  ],
});

export const BumpSequenceOp = createCompatStruct({
  codec: modern.BumpSequenceOp,
  fields: [
    { name: 'bumpTo', convert: int64Conv },
  ],
});

export const ClaimantV0 = createCompatStruct({
  codec: modern.ClaimantV0,
  fields: [
    { name: 'destination', convert: lazyConverter(() => unionConverter(PublicKey)) },
    { name: 'predicate', convert: lazyConverter(() => unionConverter(ClaimPredicate)) },
  ],
});

export const CreateClaimableBalanceOp = createCompatStruct({
  codec: modern.CreateClaimableBalanceOp,
  fields: [
    { name: 'asset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'amount', convert: int64Conv },
    { name: 'claimants', convert: lazyConverter(() => arrayConverter(unionConverter(Claimant))) },
  ],
});

export const ClaimClaimableBalanceOp = createCompatStruct({
  codec: modern.ClaimClaimableBalanceOp,
  fields: [
    { name: 'balanceID', convert: lazyConverter(() => unionConverter(ClaimableBalanceID)) },
  ],
});

export const BeginSponsoringFutureReservesOp = createCompatStruct({
  codec: modern.BeginSponsoringFutureReservesOp,
  fields: [
    { name: 'sponsoredID', convert: lazyConverter(() => unionConverter(PublicKey)) },
  ],
});

export const ClawbackOp = createCompatStruct({
  codec: modern.ClawbackOp,
  fields: [
    { name: 'asset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'from', convert: lazyConverter(() => unionConverter(MuxedAccount)) },
    { name: 'amount', convert: int64Conv },
  ],
});

export const ClawbackClaimableBalanceOp = createCompatStruct({
  codec: modern.ClawbackClaimableBalanceOp,
  fields: [
    { name: 'balanceID', convert: lazyConverter(() => unionConverter(ClaimableBalanceID)) },
  ],
});

export const SetTrustLineFlagsOp = createCompatStruct({
  codec: modern.SetTrustLineFlagsOp,
  fields: [
    { name: 'trustor', convert: lazyConverter(() => unionConverter(PublicKey)) },
    { name: 'asset', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'clearFlags', convert: id },
    { name: 'setFlags', convert: id },
  ],
});

export const LiquidityPoolDepositOp = createCompatStruct({
  codec: modern.LiquidityPoolDepositOp,
  fields: [
    { name: 'liquidityPoolID', convert: id },
    { name: 'maxAmountA', convert: int64Conv },
    { name: 'maxAmountB', convert: int64Conv },
    { name: 'minPrice', convert: structConverter(Price) },
    { name: 'maxPrice', convert: structConverter(Price) },
  ],
});

export const LiquidityPoolWithdrawOp = createCompatStruct({
  codec: modern.LiquidityPoolWithdrawOp,
  fields: [
    { name: 'liquidityPoolID', convert: id },
    { name: 'amount', convert: int64Conv },
    { name: 'minAmountA', convert: int64Conv },
    { name: 'minAmountB', convert: int64Conv },
  ],
});

export const InvokeHostFunctionOp = createCompatStruct({
  codec: modern.InvokeHostFunctionOp,
  fields: [
    { name: 'hostFunction', convert: id }, // pass through — complex union
    { name: 'auth', convert: id }, // pass through — complex auth entries
  ],
});

export const ExtendFootprintTTLOp = createCompatStruct({
  codec: modern.ExtendFootprintTTLOp,
  fields: [
    { name: 'ext', convert: id },
    { name: 'extendTo', convert: id },
  ],
});

export const RestoreFootprintOp = createCompatStruct({
  codec: modern.RestoreFootprintOp,
  fields: [
    { name: 'ext', convert: id },
  ],
});

export const LiquidityPoolConstantProductParameters = createCompatStruct({
  codec: modern.LiquidityPoolConstantProductParameters,
  fields: [
    { name: 'assetA', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'assetB', convert: lazyConverter(() => unionConverter(Asset)) },
    { name: 'fee', convert: id },
  ],
});

export const SCMapEntry = createCompatStruct({
  codec: modern.SCMapEntry,
  fields: [
    { name: 'key', convert: id }, // SCVal pass through
    { name: 'val', convert: id }, // SCVal pass through
  ],
});

// Transaction struct
export const Transaction = createCompatStruct({
  codec: modern.Transaction,
  fields: [
    { name: 'sourceAccount', convert: lazyConverter(() => unionConverter(MuxedAccount)) },
    { name: 'fee', convert: id },
    { name: 'seqNum', convert: int64Conv },
    { name: 'cond', convert: lazyConverter(() => unionConverter(Preconditions)) },
    { name: 'memo', convert: lazyConverter(() => unionConverter(Memo)) },
    { name: 'operations', convert: lazyConverter(() => arrayConverter(structConverter(Operation))) },
    { name: 'ext', convert: id },
  ],
});

export const TransactionV1Envelope = createCompatStruct({
  codec: modern.TransactionV1Envelope,
  fields: [
    { name: 'tx', convert: structConverter(Transaction) },
    { name: 'signatures', convert: arrayConverter(structConverter(DecoratedSignature)) },
  ],
});

export const FeeBumpTransactionStruct = createCompatStruct({
  codec: modern.FeeBumpTransaction,
  fields: [
    { name: 'feeSource', convert: lazyConverter(() => unionConverter(MuxedAccount)) },
    { name: 'fee', convert: int64Conv },
    { name: 'innerTx', convert: id }, // complex nested — pass through
    { name: 'ext', convert: id },
  ],
});

export const FeeBumpTransactionEnvelope = createCompatStruct({
  codec: modern.FeeBumpTransactionEnvelope,
  fields: [
    { name: 'tx', convert: structConverter(FeeBumpTransactionStruct) },
    { name: 'signatures', convert: arrayConverter(structConverter(DecoratedSignature)) },
  ],
});

export const Operation = createCompatStruct({
  codec: modern.Operation,
  fields: [
    { name: 'sourceAccount', convert: optionConverter(lazyConverter(() => unionConverter(MuxedAccount))) },
    { name: 'body', convert: lazyConverter(() => unionConverter(OperationBody)) },
  ],
});

export const SorobanResources = createCompatStruct({
  codec: modern.SorobanResources,
  fields: [
    { name: 'footprint', convert: id },
    { name: 'instructions', convert: id },
    { name: 'diskReadBytes', convert: id },
    { name: 'writeBytes', convert: id },
  ],
});

export const SorobanTransactionData = createCompatStruct({
  codec: modern.SorobanTransactionData,
  fields: [
    { name: 'ext', convert: id },
    { name: 'resources', convert: structConverter(SorobanResources) },
    { name: 'resourceFee', convert: int64Conv },
  ],
});

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------

export const PublicKey = createCompatUnion({
  codec: modern.PublicKey,
  switchEnum: PublicKeyType,
  arms: [
    { switchValues: ['publicKeyTypeEd25519'], modern: 'PublicKeyTypeEd25519', arm: 'ed25519', convert: id },
  ],
});

export const MuxedAccount = createCompatUnion({
  codec: modern.MuxedAccount,
  switchEnum: CryptoKeyType,
  arms: [
    { switchValues: ['keyTypeEd25519'], modern: 'Ed25519', arm: 'ed25519', convert: id },
    { switchValues: ['keyTypeMuxedEd25519'], modern: 'MuxedEd25519', arm: 'med25519', convert: structConverter(MuxedAccountMed25519) },
  ],
});

export const SignerKey = createCompatUnion({
  codec: modern.SignerKey,
  switchEnum: SignerKeyType,
  arms: [
    { switchValues: ['signerKeyTypeEd25519'], modern: 'Ed25519', arm: 'ed25519', convert: id },
    { switchValues: ['signerKeyTypePreAuthTx'], modern: 'PreAuthTx', arm: 'preAuthTx', convert: id },
    { switchValues: ['signerKeyTypeHashX'], modern: 'HashX', arm: 'hashX', convert: id },
    { switchValues: ['signerKeyTypeEd25519SignedPayload'], modern: 'Ed25519SignedPayload', arm: 'ed25519SignedPayload', convert: id },
  ],
});

export const Asset = createCompatUnion({
  codec: modern.Asset,
  switchEnum: AssetType,
  arms: [
    { switchValues: ['assetTypeNative'], modern: 'Native' },
    { switchValues: ['assetTypeCreditAlphanum4'], modern: 'CreditAlphanum4', arm: 'alphaNum4', convert: structConverter(AlphaNum4) },
    { switchValues: ['assetTypeCreditAlphanum12'], modern: 'CreditAlphanum12', arm: 'alphaNum12', convert: structConverter(AlphaNum12) },
  ],
});

export const ChangeTrustAsset = createCompatUnion({
  codec: modern.ChangeTrustAsset,
  switchEnum: ChangeTrustAssetType,
  arms: [
    { switchValues: ['assetTypeNative'], modern: 'Native' },
    { switchValues: ['assetTypeCreditAlphanum4'], modern: 'CreditAlphanum4', arm: 'alphaNum4', convert: structConverter(AlphaNum4) },
    { switchValues: ['assetTypeCreditAlphanum12'], modern: 'CreditAlphanum12', arm: 'alphaNum12', convert: structConverter(AlphaNum12) },
    { switchValues: ['assetTypePoolShare'], modern: 'LiquidityPoolConstantProduct', arm: 'liquidityPool', convert: lazyConverter(() => unionConverter(LiquidityPoolParameters)) },
  ],
});

export const Memo = createCompatUnion({
  codec: modern.Memo,
  switchEnum: MemoType,
  arms: [
    { switchValues: ['memoNone'], modern: 'None' },
    { switchValues: ['memoText'], modern: 'Text', arm: 'text', convert: id },
    { switchValues: ['memoId'], modern: 'Id', arm: 'id', convert: uint64Conv },
    { switchValues: ['memoHash'], modern: 'Hash', arm: 'hash', convert: id },
    { switchValues: ['memoReturn'], modern: 'Return', arm: 'retHash', convert: id },
  ],
});

export const Preconditions = createCompatUnion({
  codec: modern.Preconditions,
  switchEnum: PreconditionType,
  arms: [
    { switchValues: ['precondNone'], modern: 'None' },
    { switchValues: ['precondTime'], modern: 'Time', arm: 'timeBounds', convert: structConverter(TimeBounds) },
    { switchValues: ['precondV2'], modern: 'V2', arm: 'v2', convert: structConverter(PreconditionsV2) },
  ],
});

export const ClaimPredicate = createCompatUnion({
  codec: modern.ClaimPredicate,
  switchEnum: ClaimPredicateType,
  arms: [
    { switchValues: ['claimPredicateUnconditional'], modern: 'Unconditional' },
    { switchValues: ['claimPredicateAnd'], modern: 'And', arm: 'andPredicates', convert: lazyConverter(() => arrayConverter(unionConverter(ClaimPredicate))) },
    { switchValues: ['claimPredicateOr'], modern: 'Or', arm: 'orPredicates', convert: lazyConverter(() => arrayConverter(unionConverter(ClaimPredicate))) },
    { switchValues: ['claimPredicateNot'], modern: 'Not', arm: 'notPredicate', convert: lazyConverter(() => optionConverter(unionConverter(ClaimPredicate))) },
    { switchValues: ['claimPredicateBeforeAbsoluteTime'], modern: 'BeforeAbsoluteTime', arm: 'absBefore', convert: int64Conv },
    { switchValues: ['claimPredicateBeforeRelativeTime'], modern: 'BeforeRelativeTime', arm: 'relBefore', convert: int64Conv },
  ],
});

export const Claimant = createCompatUnion({
  codec: modern.Claimant,
  switchEnum: ClaimantType,
  arms: [
    { switchValues: ['claimantTypeV0'], modern: 'ClaimantTypeV0', arm: 'v0', convert: structConverter(ClaimantV0) },
  ],
});

export const ClaimableBalanceID = createCompatUnion({
  codec: modern.ClaimableBalanceID,
  switchEnum: ClaimableBalanceIDType,
  arms: [
    { switchValues: ['claimableBalanceIdTypeV0'], modern: 'ClaimableBalanceIdTypeV0', arm: 'v0', convert: id },
  ],
});

export const LiquidityPoolParameters = createCompatUnion({
  codec: modern.LiquidityPoolParameters,
  switchEnum: LiquidityPoolType,
  arms: [
    { switchValues: ['liquidityPoolConstantProduct'], modern: 'LiquidityPoolConstantProduct', arm: 'constantProduct', convert: structConverter(LiquidityPoolConstantProductParameters) },
  ],
});

export const SCAddress = createCompatUnion({
  codec: modern.SCAddress,
  switchEnum: SCAddressType,
  arms: [
    { switchValues: ['scAddressTypeAccount'], modern: 'Account', arm: 'accountId', convert: lazyConverter(() => unionConverter(PublicKey)) },
    { switchValues: ['scAddressTypeContract'], modern: 'Contract', arm: 'contractId', convert: id },
    { switchValues: ['scAddressTypeMuxedAccount'], modern: 'MuxedAccount', arm: 'muxedAccount', convert: id },
    { switchValues: ['scAddressTypeClaimableBalance'], modern: 'ClaimableBalance', arm: 'claimableBalance', convert: lazyConverter(() => unionConverter(ClaimableBalanceID)) },
    { switchValues: ['scAddressTypeLiquidityPool'], modern: 'LiquidityPool', arm: 'liquidityPool', convert: id },
  ],
});

export const OperationBody = createCompatUnion({
  codec: modern.OperationBody,
  switchEnum: OperationType,
  arms: [
    { switchValues: ['createAccount'], modern: 'CreateAccount', arm: 'createAccountOp', convert: structConverter(CreateAccountOp) },
    { switchValues: ['payment'], modern: 'Payment', arm: 'paymentOp', convert: structConverter(PaymentOp) },
    { switchValues: ['pathPaymentStrictReceive'], modern: 'PathPaymentStrictReceive', arm: 'pathPaymentStrictReceiveOp', convert: structConverter(PathPaymentStrictReceiveOp) },
    { switchValues: ['manageSellOffer'], modern: 'ManageSellOffer', arm: 'manageSellOfferOp', convert: structConverter(ManageSellOfferOp) },
    { switchValues: ['createPassiveSellOffer'], modern: 'CreatePassiveSellOffer', arm: 'createPassiveSellOfferOp', convert: structConverter(CreatePassiveSellOfferOp) },
    { switchValues: ['setOptions'], modern: 'SetOptions', arm: 'setOptionsOp', convert: structConverter(SetOptionsOp) },
    { switchValues: ['changeTrust'], modern: 'ChangeTrust', arm: 'changeTrustOp', convert: structConverter(ChangeTrustOp) },
    { switchValues: ['allowTrust'], modern: 'AllowTrust', arm: 'allowTrustOp', convert: structConverter(AllowTrustOp) },
    { switchValues: ['accountMerge'], modern: 'AccountMerge', arm: 'destination', convert: lazyConverter(() => unionConverter(MuxedAccount)) },
    { switchValues: ['inflation'], modern: 'Inflation' },
    { switchValues: ['manageData'], modern: 'ManageData', arm: 'manageDataOp', convert: structConverter(ManageDataOp) },
    { switchValues: ['bumpSequence'], modern: 'BumpSequence', arm: 'bumpSequenceOp', convert: structConverter(BumpSequenceOp) },
    { switchValues: ['manageBuyOffer'], modern: 'ManageBuyOffer', arm: 'manageBuyOfferOp', convert: structConverter(ManageBuyOfferOp) },
    { switchValues: ['pathPaymentStrictSend'], modern: 'PathPaymentStrictSend', arm: 'pathPaymentStrictSendOp', convert: structConverter(PathPaymentStrictSendOp) },
    { switchValues: ['createClaimableBalance'], modern: 'CreateClaimableBalance', arm: 'createClaimableBalanceOp', convert: structConverter(CreateClaimableBalanceOp) },
    { switchValues: ['claimClaimableBalance'], modern: 'ClaimClaimableBalance', arm: 'claimClaimableBalanceOp', convert: structConverter(ClaimClaimableBalanceOp) },
    { switchValues: ['beginSponsoringFutureReserves'], modern: 'BeginSponsoringFutureReserves', arm: 'beginSponsoringFutureReservesOp', convert: structConverter(BeginSponsoringFutureReservesOp) },
    { switchValues: ['endSponsoringFutureReserves'], modern: 'EndSponsoringFutureReserves' },
    { switchValues: ['revokeSponsorship'], modern: 'RevokeSponsorship', arm: 'revokeSponsorshipOp', convert: id },
    { switchValues: ['clawback'], modern: 'Clawback', arm: 'clawbackOp', convert: structConverter(ClawbackOp) },
    { switchValues: ['clawbackClaimableBalance'], modern: 'ClawbackClaimableBalance', arm: 'clawbackClaimableBalanceOp', convert: structConverter(ClawbackClaimableBalanceOp) },
    { switchValues: ['setTrustLineFlags'], modern: 'SetTrustLineFlags', arm: 'setTrustLineFlagsOp', convert: structConverter(SetTrustLineFlagsOp) },
    { switchValues: ['liquidityPoolDeposit'], modern: 'LiquidityPoolDeposit', arm: 'liquidityPoolDepositOp', convert: structConverter(LiquidityPoolDepositOp) },
    { switchValues: ['liquidityPoolWithdraw'], modern: 'LiquidityPoolWithdraw', arm: 'liquidityPoolWithdrawOp', convert: structConverter(LiquidityPoolWithdrawOp) },
    { switchValues: ['invokeHostFunction'], modern: 'InvokeHostFunction', arm: 'invokeHostFunctionOp', convert: structConverter(InvokeHostFunctionOp) },
    { switchValues: ['extendFootprintTtl'], modern: 'ExtendFootprintTtl', arm: 'extendFootprintTtlOp', convert: structConverter(ExtendFootprintTTLOp) },
    { switchValues: ['restoreFootprint'], modern: 'RestoreFootprint', arm: 'restoreFootprintOp', convert: structConverter(RestoreFootprintOp) },
  ],
});

export const TransactionEnvelope = createCompatUnion({
  codec: modern.TransactionEnvelope,
  switchEnum: EnvelopeType,
  arms: [
    { switchValues: ['envelopeTypeTx'], modern: 'Tx', arm: 'v1', convert: structConverter(TransactionV1Envelope) },
    { switchValues: ['envelopeTypeTxFeeBump'], modern: 'TxFeeBump', arm: 'feeBump', convert: structConverter(FeeBumpTransactionEnvelope) },
  ],
});
