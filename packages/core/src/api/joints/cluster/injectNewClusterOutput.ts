import { BIish } from '@ckb-lumos/bi';
import { bytes } from '@ckb-lumos/codec';
import { Script } from '@ckb-lumos/base';
import { BI, Cell, helpers } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { packRawClusterData, RawClusterData } from '../../../codec';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { correctCellMinimalCapacity, setAbsoluteCapacityMargin } from '../../../helpers';
import { injectNewClusterIds } from './injectNewClusterIds';

export function injectNewClusterOutput(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  data: RawClusterData;
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

  // Check the referenced Mutant's ID format
  if (props.data.mutantId !== void 0) {
    const packedMutantId = bytes.bytify(props.data.mutantId!);
    if (packedMutantId.byteLength !== 32) {
      throw new Error(`Invalid Mutant Id length, expected 32, actually: ${packedMutantId.byteLength}`);
    }
  }

  // Create Cluster cell (the latest version)
  const clusterScript = getSporeScript(config, 'Cluster');
  const clusterData = packRawClusterData(props.data, clusterScript.behaviors?.clusterDataVersion as any);
  let clusterCell: Cell = correctCellMinimalCapacity({
    cellOutput: {
      capacity: '0x0',
      lock: props.toLock,
      type: {
        ...clusterScript.script,
        args: '0x' + '0'.repeat(64), // Fill 32-byte TypeId placeholder
      },
    },
    data: bytes.hexify(clusterData),
  });

  // Add to Transaction.outputs
  const outputIndex = txSkeleton.get('outputs').size;
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    if (props.capacityMargin !== void 0) {
      clusterCell = setAbsoluteCapacityMargin(clusterCell, props.capacityMargin);
    }
    if (props.updateOutput instanceof Function) {
      clusterCell = props.updateOutput(clusterCell);
    }
    return outputs.push(clusterCell);
  });

  // Fix the output's index to prevent it from future reduction
  txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
    return fixedEntries.push({
      field: 'outputs',
      index: outputIndex,
    });
  });

  // Generate ID for the new Cluster if possible
  const firstInput = txSkeleton.get('inputs').first();
  if (firstInput) {
    txSkeleton = injectNewClusterIds({
      outputIndices: [outputIndex],
      txSkeleton,
      config,
    });
  }

  // Add Cluster required cellDeps
  txSkeleton = addCellDep(txSkeleton, clusterScript.cellDep);
  // Add Mutant cellDeps if ClusterData.mutantId is specified
  if (props.data.mutantId !== void 0) {
    const mutantScript = getSporeScript(config, 'Mutant');
    txSkeleton = addCellDep(txSkeleton, mutantScript.cellDep);
  }

  return {
    txSkeleton,
    outputIndex,
    hasId: firstInput !== void 0,
  };
}
