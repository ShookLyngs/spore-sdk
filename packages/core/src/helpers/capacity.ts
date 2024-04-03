import cloneDeep from 'lodash/cloneDeep';
import { BIish } from '@ckb-lumos/bi';
import { BI, helpers } from '@ckb-lumos/lumos';
import { Config } from '@ckb-lumos/config-manager';
import { Address, Script, Cell } from '@ckb-lumos/base';
import { common, FromInfo } from '@ckb-lumos/common-scripts';
import { isScriptValueEquals } from './script';
import { fromInfoToAddress } from './address';

/**
 * Calculate target cell's minimal occupied capacity by lock script.
 */
export function minimalCellCapacityByLock(lock: Script): BI {
  return helpers.minimalCellCapacityCompatible({
    cellOutput: {
      capacity: '0x0',
      lock,
    },
    data: '0x',
  });
}

/**
 * Fix cell's minimal occupied capacity by 'helpers.minimalCellCapacityCompatible' API.
 * Note: this function will modify the original cell object.
 */
export function correctCellMinimalCapacity(cell: Cell): Cell {
  const occupiedCapacity = helpers.minimalCellCapacityCompatible(cell);
  if (!occupiedCapacity.eq(cell.cellOutput.capacity)) {
    cell.cellOutput.capacity = occupiedCapacity.toHexString();
  }

  return cell;
}

/**
 * Make sure the target cell has declared enough amount of capacity.
 */
export function assetCellMinimalCapacity(cell: Cell): void {
  const minimalCapacity = helpers.minimalCellCapacityCompatible(cell);
  if (minimalCapacity.gt(cell.cellOutput.capacity)) {
    const minimal = minimalCapacity.toString();
    const declared = BI.from(cell.cellOutput.capacity).toString();
    throw new Error(`Target cell required capacity of ${minimal}, but declared ${declared}`);
  }
}

/**
 * Calculate the target cell's capacity margin.
 * Could be negative if the cell's declared capacity is not enough.
 */
export function getCellCapacityMargin(cell: Cell): BI {
  const minimalCapacity = helpers.minimalCellCapacityCompatible(cell);
  return BI.from(cell.cellOutput.capacity).sub(minimalCapacity);
}

/**
 * Set absolute capacity margin for a cell.
 * The term 'absolute' means the cell's capacity will be: 'minimal capacity' + 'capacity margin'.
 */
export function setAbsoluteCapacityMargin(
  cell: Cell,
  capacityMargin: BIish | ((cell: Cell, margin: BI) => BIish),
): Cell {
  cell = cloneDeep(cell);

  const currentMargin = getCellCapacityMargin(cell);
  const margin: BIish = capacityMargin instanceof Function ? capacityMargin(cell, currentMargin) : capacityMargin;

  const minimalCapacity = helpers.minimalCellCapacityCompatible(cell);
  cell.cellOutput.capacity = minimalCapacity.add(margin).toHexString();
  return cell;
}

/**
 * Count the total declared capacity in a List<Cell>.
 */
export function getCellsTotalCapacity(cells: Cell[]): BI {
  return cells.reduce((sum, cell) => sum.add(cell.cellOutput.capacity), BI.from(0));
}

/**
 * The snapshot result of inputs/outputs from a Transaction.
 * Note that both inputsRemainCapacity/outputsRemainCapacity can be negative.
 */
export interface CapacitySnapshot {
  inputsLength: number;
  outputsLength: number;
  inputsCapacity: BI;
  outputsCapacity: BI;
  inputsRemainCapacity: BI;
  outputsRemainCapacity: BI;
}

/**
 * Summarize the capacity/length difference between inputs/outputs of a TransactionSkeleton.
 * This is a sugar function of 'createCapacitySnapshot'.
 */
export function createCapacitySnapshotFromTransactionSkeleton(
  txSkeleton: helpers.TransactionSkeletonType,
): CapacitySnapshot {
  return createCapacitySnapshot(txSkeleton.get('inputs').toArray(), txSkeleton.get('outputs').toArray());
}

/**
 * Summarize the capacity/length difference between inputs/outputs of a Transaction.
 */
export function createCapacitySnapshot(inputs: Cell[], outputs: Cell[]): CapacitySnapshot {
  const inputsCapacity = getCellsTotalCapacity(inputs);
  const outputsCapacity = getCellsTotalCapacity(outputs);
  const inputsRemainCapacity = inputsCapacity.sub(outputsCapacity);
  const outputsRemainCapacity = outputsCapacity.sub(inputsCapacity);

  return {
    inputsLength: inputs.length,
    outputsLength: outputs.length,
    inputsCapacity,
    outputsCapacity,
    inputsRemainCapacity,
    outputsRemainCapacity,
  };
}

/**
 * Calculates the capacity different in inputs/outputs of a Transaction,
 * then fix the change cell's containing capacity if inputs' total capacity has any left.
 *
 * Note: normally the change cell is the last cell in Transaction.outputs,
 * but if things are different, you can also provide the change cell's output index.
 */
export function correctChangeCellCapacity(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  changeOutputIndex?: number;
}): helpers.TransactionSkeletonType {
  let txSkeleton = props.txSkeleton;

  const snapshot = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);

  if (snapshot.inputsRemainCapacity.gt(0)) {
    const outputIndex = props.changeOutputIndex ?? txSkeleton.get('outputs').size - 1;
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      const output = outputs.get(outputIndex);
      if (!output) {
        throw new Error('Cannot correct change cell capacity because Transaction.outputs is empty');
      }

      const oldCapacity = BI.from(output.cellOutput.capacity);
      output.cellOutput.capacity = oldCapacity.add(snapshot.inputsRemainCapacity).toHexString();
      return outputs;
    });
  }

  return txSkeleton;
}

/**
 * Calculate the capacity difference between inputs/outputs of a Transaction,
 * and see how much capacity is needed for the transaction to be constructed.
 */
export function calculateNeededCapacity(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  changeAddress: Address;
  extraCapacity?: BIish;
  config?: Config;
}): {
  snapshot: CapacitySnapshot;
  neededCapacity: BI;
  exceedCapacity: BI;
} {
  let txSkeleton = props.txSkeleton;

  const snapshot = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);
  const changeLock = helpers.parseAddress(props.changeAddress, { config: props.config });

  const extraCapacity = BI.from(props.extraCapacity ?? 0);
  const minChangeCapacity = minimalCellCapacityByLock(changeLock).add(extraCapacity);

  let exceedCapacity = snapshot.inputsRemainCapacity;
  let neededCapacity = snapshot.outputsRemainCapacity.add(extraCapacity);

  // Collect one more cell if:
  // 1. Has sufficient capacity for transaction construction
  // 2. Has insufficient capacity for adding a change cell to Transaction.outputs
  const sufficientForTransaction = neededCapacity.lte(0) && exceedCapacity.gt(0);
  const insufficientForChangeCell = exceedCapacity.lt(minChangeCapacity);
  if (sufficientForTransaction && insufficientForChangeCell) {
    neededCapacity = minChangeCapacity;
    exceedCapacity = BI.from(0);
  }

  if (neededCapacity.lt(0)) {
    neededCapacity = BI.from(0);
  }
  if (exceedCapacity.lt(0)) {
    exceedCapacity = BI.from(0);
  }

  return {
    snapshot,
    neededCapacity,
    exceedCapacity,
  };
}

/**
 * Calculate the minimal required capacity for the transaction to be constructed,
 * and then collect cells to inputs, it also fills cellDeps and witnesses.
 * After collecting, it will generate an output to return unused ckb.
 */
export async function injectNeededCapacity(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  fromInfos: FromInfo[];
  config?: Config;
  extraCapacity?: BIish;
  changeAddress?: Address;
  enableDeductCapacity?: boolean;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  before: CapacitySnapshot;
  after?: CapacitySnapshot;
}> {
  let txSkeleton = props.txSkeleton;

  const config = props.config;
  const changeAddress = fromInfoToAddress(props.changeAddress ?? props.fromInfos[0], config);

  // Calculate needed or exceeded capacity
  const calculated = calculateNeededCapacity({
    extraCapacity: props.extraCapacity,
    changeAddress,
    txSkeleton,
    config,
  });

  const before: CapacitySnapshot = calculated.snapshot;
  let after: CapacitySnapshot | undefined;

  // Collect needed capacity using `common.injectCapacity` API from lumos
  if (calculated.neededCapacity.gt(0)) {
    txSkeleton = await common.injectCapacity(
      txSkeleton,
      props.fromInfos,
      calculated.neededCapacity,
      props.changeAddress,
      void 0,
      {
        enableDeductCapacity: props.enableDeductCapacity,
        config: props.config,
      },
    );

    after = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);
  }

  // If no needed capacity, and has exceeded capacity to be return as change
  if (calculated.neededCapacity.lte(0) && calculated.exceedCapacity.gt(0)) {
    const returnResult = returnExceededCapacity({
      txSkeleton,
      changeAddress,
      config,
    });

    if (returnResult.returnedChange) {
      txSkeleton = returnResult.txSkeleton;
    }
  }

  return {
    txSkeleton,
    before,
    after,
  };
}

/**
 * Return exceeded capacity in Transaction.inputs to Transaction.outputs as change.
 * The strategy is:
 * - If there is an unfixed last output with the same lock as change lock, then add the exceeded capacity to it.
 * - If no unfixed output with the same lock as change lock was found, generate a change cell to Transaction.outputs.
 */
export function returnExceededCapacity(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  changeAddress: Address;
  config?: Config;
}): {
  txSkeleton: helpers.TransactionSkeletonType;
  returnedChange: boolean;
  createdChangeCell: boolean;
  changeCellOutputIndex: number;
} {
  // Summary inputs/outputs capacity status
  let txSkeleton = props.txSkeleton;
  const snapshot = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);

  // Status
  let returnedChange: boolean = false;
  let createdChangeCell: boolean = false;
  let changeCellOutputIndex: number = -1;

  // If no exceeded capacity, simply end the process
  if (snapshot.inputsRemainCapacity.lte(0)) {
    return {
      txSkeleton,
      returnedChange,
      createdChangeCell,
      changeCellOutputIndex,
    };
  }

  // If found any exceeded capacity
  returnedChange = true;

  const changeLock = helpers.parseAddress(props.changeAddress, {
    config: props.config,
  });

  // Find the last unfixed output with the same lock as change lock
  const fixedOutputs = txSkeleton
    .get('fixedEntries')
    .filter(({ field }) => field === 'outputs')
    .map(({ index }) => index);
  const matchLastOutputIndex = txSkeleton
    .get('outputs')
    .filter((_, index) => fixedOutputs.includes(index))
    .findLastIndex((r) => isScriptValueEquals(r.cellOutput.lock, changeLock));

  if (matchLastOutputIndex > -1) {
    // If an unfixed output exists and its lock is the same as change lock,
    // then add the exceeded capacity to it.
    changeCellOutputIndex = matchLastOutputIndex;
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      const output = outputs.get(matchLastOutputIndex)!;
      output.cellOutput.capacity = BI.from(output.cellOutput.capacity).add(snapshot.inputsRemainCapacity).toHexString();

      return outputs.set(matchLastOutputIndex, output);
    });
  } else {
    // If no unfixed output with the same lock found in the outputs,
    // generate a change cell to Transaction.outputs.
    createdChangeCell = true;
    const changeCell: Cell = {
      cellOutput: {
        capacity: snapshot.inputsRemainCapacity.toHexString(),
        lock: changeLock,
      },
      data: '0x',
    };
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      changeCellOutputIndex = outputs.size;
      return outputs.push(changeCell);
    });
  }

  return {
    txSkeleton,
    returnedChange,
    createdChangeCell,
    changeCellOutputIndex,
  };
}
