import { BIish } from '@ckb-lumos/bi';
import { PackedSince } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { assetCellMinimalCapacity, setAbsoluteCapacityMargin, setupCell } from '../../../helpers';

export async function injectLiveClusterAgentCell(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  cell: Cell;
  addOutput?: boolean;
  config?: SporeConfig;
  updateOutput?(cell: Cell): Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const clusterAgentCell = props.cell;

  // TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Check the target cell's type
  const cellType = clusterAgentCell.cellOutput.type;
  const clusterAgentScript = getSporeScript(config, 'ClusterAgent', cellType!);
  if (!cellType || !clusterAgentScript) {
    throw new Error('Cannot inject ClusterAgent because target cell is not a supported version of ClusterAgent');
  }

  // Add the target cell to Transaction.inputs (and outputs if needed)
  const setupCellResult = await setupCell({
    txSkeleton,
    input: clusterAgentCell,
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

  // If the target cell has been added to Transaction.outputs
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

  // Add ClusterAgent required cellDeps
  txSkeleton = addCellDep(txSkeleton, clusterAgentScript.cellDep);

  return {
    txSkeleton,
    inputIndex: setupCellResult.inputIndex,
    outputIndex: setupCellResult.outputIndex,
  };
}
