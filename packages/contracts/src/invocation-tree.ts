/**
 * Utilities for walking Soroban authorized invocation trees.
 */

import {
  is,
  encodeStrkey,
  STRKEY_CONTRACT,
  STRKEY_ED25519_PUBLIC,
  type SorobanAuthorizedInvocation,
  type SorobanAuthorizedFunction,
  type SCVal,
  type SCAddress,
} from '@stellar/xdr';

export interface InvocationTreeExecuteArgs {
  source: string;
  function: string;
  args: readonly SCVal[];
}

export interface InvocationTreeCreateArgs {
  type: 'wasm' | 'asset';
}

export interface InvocationTree {
  type: 'execute' | 'create' | 'create_v2';
  args: InvocationTreeExecuteArgs | InvocationTreeCreateArgs;
  invocations: InvocationTree[];
}

function scAddressToString(addr: SCAddress): string {
  if (is(addr, 'Contract')) {
    return encodeStrkey(STRKEY_CONTRACT, addr.Contract);
  }
  if (is(addr, 'Account')) {
    if (is(addr.Account, 'PublicKeyTypeEd25519')) {
      return encodeStrkey(STRKEY_ED25519_PUBLIC, addr.Account.PublicKeyTypeEd25519);
    }
  }
  return '<unknown>';
}

function buildArgs(fn: SorobanAuthorizedFunction): InvocationTree['args'] {
  if (is(fn, 'ContractFn')) {
    return {
      source: scAddressToString(fn.ContractFn.contractAddress),
      function: fn.ContractFn.functionName,
      args: fn.ContractFn.args,
    };
  }
  if (is(fn, 'CreateContractHostFn')) {
    return { type: 'wasm' };
  }
  // CreateContractV2HostFn
  return { type: 'wasm' };
}

function getType(fn: SorobanAuthorizedFunction): InvocationTree['type'] {
  if (is(fn, 'ContractFn')) return 'execute';
  if (is(fn, 'CreateContractHostFn')) return 'create';
  return 'create_v2';
}

/**
 * Build a tree representation of a SorobanAuthorizedInvocation.
 */
export function buildInvocationTree(
  root: SorobanAuthorizedInvocation,
): InvocationTree {
  return {
    type: getType(root.function),
    args: buildArgs(root.function),
    invocations: root.subInvocations.map(buildInvocationTree),
  };
}

/**
 * Walk a SorobanAuthorizedInvocation tree depth-first.
 * Return `false` from callback to skip children of the current node.
 */
export function walkInvocationTree(
  root: SorobanAuthorizedInvocation,
  callback: (
    node: SorobanAuthorizedInvocation,
    depth: number,
  ) => boolean | void,
): void {
  walk(root, callback, 0);
}

function walk(
  node: SorobanAuthorizedInvocation,
  callback: (
    node: SorobanAuthorizedInvocation,
    depth: number,
  ) => boolean | void,
  depth: number,
): void {
  const result = callback(node, depth);
  if (result === false) return;
  for (const sub of node.subInvocations) {
    walk(sub, callback, depth + 1);
  }
}
