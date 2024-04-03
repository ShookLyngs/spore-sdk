import { BIish } from '@ckb-lumos/bi';
import { PackedSince } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { assetCellMinimalCapacity, setAbsoluteCapacityMargin, setupCell } from '../../../helpers';

export async function injectLiveClusterCell(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  cell: Cell;
  addOutput?: boolean;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}> {
  // Env
  const clusterCell = props.cell;
  const config = props.config ?? getSporeConfig();

  // Get TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Check target cell's type
  const clusterCellType = clusterCell.cellOutput.type;
  const clusterScript = getSporeScript(config, 'Cluster', clusterCellType!);
  if (!clusterCellType || !clusterScript) {
    throw new Error('Cannot inject Cluster because target cell is not a supported version of Cluster');
  }

  // Add cluster cell to Transaction.inputs
  const setupCellResult = await setupCell({
    txSkeleton,
    input: props.cell,
    config: config.lumos,
    addOutput: props.addOutput,
    updateOutput(cell) {
      if (props.capacityMargin !== void 0) {
        cell = setAbsoluteCapacityMargin(cell, props.capacityMargin);
      }
      if (props.updateOutput instanceof Function) {
        cell = props.updateOutput(cell);
      }
      return cell;
    },
    defaultWitness: props.defaultWitness,
    updateWitness: props.updateWitness,
    since: props.since,
  });
  txSkeleton = setupCellResult.txSkeleton;

  // If the cluster is added to Transaction.outputs
  if (props.addOutput) {
    // Make sure the cell's output has declared enough capacity
    const output = txSkeleton.get('outputs').get(setupCellResult.outputIndex)!;
    assetCellMinimalCapacity(output);

    // Fix the cell's output index
    txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
      return fixedEntries.push({
        field: 'outputs',
        index: setupCellResult.outputIndex,
      });
    });
  }

  // Add cluster required cellDeps
  txSkeleton = addCellDep(txSkeleton, clusterScript.cellDep);

  return {
    txSkeleton,
    inputIndex: setupCellResult.inputIndex,
    outputIndex: setupCellResult.outputIndex,
  };
}
