import { BIish } from '@ckb-lumos/bi';
import { Script } from '@ckb-lumos/base';
import { bytes, BytesLike } from '@ckb-lumos/codec';
import { BI, Cell, helpers } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { packRawMutantArgs } from '../../../codec';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { correctCellMinimalCapacity, setAbsoluteCapacityMargin } from '../../../helpers';
import { injectNewMutantIds } from './injectNewMutantIds';

export function injectNewMutantOutput(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  minPayment?: BIish;
  data: BytesLike;
  toLock: Script;
  config?: SporeConfig;
  updateOutput?(cell: Cell): Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
}): {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  hasId: boolean;
} {
  // Env
  const config = props.config ?? getSporeConfig();

  // Get TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Create Mutant cell (the latest version)
  const mutantScript = getSporeScript(config, 'Mutant');
  let mutantCell: Cell = correctCellMinimalCapacity({
    cellOutput: {
      capacity: '0x0',
      lock: props.toLock,
      type: {
        ...mutantScript.script,
        args: bytes.hexify(
          packRawMutantArgs({
            id: '0x' + '0'.repeat(64), // Fill 32-byte TypeId placeholder
            minPayment: props.minPayment !== void 0 ? BI.from(props.minPayment) : void 0,
          }),
        ),
      },
    },
    data: bytes.hexify(props.data),
  });

  // Add to Transaction.outputs
  const outputIndex = txSkeleton.get('outputs').size;
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    if (props.capacityMargin !== void 0) {
      mutantCell = setAbsoluteCapacityMargin(mutantCell, props.capacityMargin);
    }
    if (props.updateOutput instanceof Function) {
      mutantCell = props.updateOutput(mutantCell);
    }
    return outputs.push(mutantCell);
  });

  // Fix the output's index to prevent it from future reduction
  txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
    return fixedEntries.push({
      field: 'outputs',
      index: outputIndex,
    });
  });

  // Generate ID for the new Mutant if possible
  const firstInput = txSkeleton.get('inputs').first();
  if (firstInput) {
    txSkeleton = injectNewMutantIds({
      outputIndices: [outputIndex],
      txSkeleton,
      config,
    });
  }

  // Add Lua lib script as cellDep
  const luaScript = getSporeScript(config, 'Lua');
  txSkeleton = addCellDep(txSkeleton, luaScript.cellDep);
  // Add Mutant script as cellDep
  txSkeleton = addCellDep(txSkeleton, mutantScript.cellDep);

  return {
    txSkeleton,
    outputIndex,
    hasId: firstInput !== void 0,
  };
}
