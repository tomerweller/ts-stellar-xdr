import { describe, it, expect } from 'vitest';
import {
  buildInvocationTree,
  walkInvocationTree,
} from '../src/invocation-tree.js';
import {
  encodeStrkey,
  STRKEY_CONTRACT,
  STRKEY_ED25519_PUBLIC,
  type SorobanAuthorizedInvocation,
  type SCVal,
} from '@stellar/xdr';

function makeContractAddress(seed: number): { Contract: Uint8Array } {
  const bytes = new Uint8Array(32);
  bytes[0] = seed;
  return { Contract: bytes };
}

function makeContractFn(
  seed: number,
  name: string,
  args: readonly SCVal[] = [],
  subInvocations: SorobanAuthorizedInvocation[] = [],
): SorobanAuthorizedInvocation {
  return {
    function: {
      ContractFn: {
        contractAddress: makeContractAddress(seed),
        functionName: name,
        args,
      },
    },
    subInvocations,
  };
}

describe('buildInvocationTree', () => {
  it('builds tree for simple invocation', () => {
    const root = makeContractFn(1, 'transfer', [{ U64: 100n }]);
    const tree = buildInvocationTree(root);

    expect(tree.type).toBe('execute');
    expect(tree.invocations).toHaveLength(0);
    if (tree.type === 'execute' && 'source' in tree.args) {
      expect(tree.args.function).toBe('transfer');
      expect(tree.args.args).toHaveLength(1);
      // source should be a C-address
      expect(tree.args.source).toMatch(/^C[A-Z2-7]{55}$/);
    }
  });

  it('builds nested 3-level tree', () => {
    const leaf = makeContractFn(3, 'mint');
    const mid = makeContractFn(2, 'approve', [], [leaf]);
    const root = makeContractFn(1, 'swap', [], [mid]);

    const tree = buildInvocationTree(root);

    expect(tree.type).toBe('execute');
    expect(tree.invocations).toHaveLength(1);
    expect(tree.invocations[0]!.type).toBe('execute');
    expect(tree.invocations[0]!.invocations).toHaveLength(1);
    expect(tree.invocations[0]!.invocations[0]!.type).toBe('execute');
    expect(tree.invocations[0]!.invocations[0]!.invocations).toHaveLength(0);
  });
});

describe('walkInvocationTree', () => {
  it('walks all nodes in a simple invocation', () => {
    const root = makeContractFn(1, 'transfer');
    const visited: number[] = [];

    walkInvocationTree(root, (_node, depth) => {
      visited.push(depth);
    });

    expect(visited).toEqual([0]);
  });

  it('walks 3-level tree depth-first', () => {
    const leaf = makeContractFn(3, 'mint');
    const mid = makeContractFn(2, 'approve', [], [leaf]);
    const root = makeContractFn(1, 'swap', [], [mid]);

    const names: string[] = [];
    walkInvocationTree(root, (node) => {
      if ('ContractFn' in node.function) {
        names.push(node.function.ContractFn.functionName);
      }
    });

    expect(names).toEqual(['swap', 'approve', 'mint']);
  });

  it('early-stops when callback returns false', () => {
    const leaf = makeContractFn(3, 'mint');
    const mid = makeContractFn(2, 'approve', [], [leaf]);
    const root = makeContractFn(1, 'swap', [], [mid]);

    const names: string[] = [];
    walkInvocationTree(root, (node) => {
      if ('ContractFn' in node.function) {
        names.push(node.function.ContractFn.functionName);
        if (node.function.ContractFn.functionName === 'approve') {
          return false; // stop descending
        }
      }
    });

    expect(names).toEqual(['swap', 'approve']);
  });

  it('provides correct depth values', () => {
    const leaf = makeContractFn(3, 'mint');
    const mid = makeContractFn(2, 'approve', [], [leaf]);
    const root = makeContractFn(1, 'swap', [], [mid]);

    const depths: number[] = [];
    walkInvocationTree(root, (_node, depth) => {
      depths.push(depth);
    });

    expect(depths).toEqual([0, 1, 2]);
  });
});
