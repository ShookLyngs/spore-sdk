import { Cell, Script } from '@ckb-lumos/base';
import { TransactionSkeletonType } from '@ckb-lumos/helpers';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { isScriptValueEquals } from './script';
import { PromiseOr } from '../types';

export async function referenceCellOrLockProxy(props: {
  txSkeleton: TransactionSkeletonType;
  cell: Cell;
  inputLocks: Script[];
  outputLocks: Script[];
  referenceCell: (txSkeleton: TransactionSkeletonType) => PromiseOr<TransactionSkeletonType>;
  referenceLockProxy: (txSkeleton: TransactionSkeletonType) => PromiseOr<TransactionSkeletonType>;
  addCellToCellDeps?: boolean;
}): Promise<{
  txSkeleton: TransactionSkeletonType;
  referencedCell: boolean;
  referencedLockProxy: boolean;
}> {
  // Env
  const addCellToCellDeps = props.addCellToCellDeps ?? true;

  // TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // The reference cell
  const cell = props.cell;
  const cellLock = cell.cellOutput.lock;
  if (!cell.outPoint) {
    throw new Error('Cannot reference cell because target cell has no OutPoint');
  }

  // Inputs/Outputs conditions
  const hasTargetLockInInputs = props.inputLocks.some((script) => {
    return isScriptValueEquals(cellLock, script);
  });
  const hasTargetLockInOutputs = props.outputLocks.some((script) => {
    return isScriptValueEquals(cellLock, script);
  });

  // Summarize conditions
  const referencedLockProxy = hasTargetLockInInputs && hasTargetLockInOutputs;
  const referencedCell = !hasTargetLockInInputs || !hasTargetLockInOutputs;

  // Inject the target cell's LockProxy to the transaction
  if (referencedLockProxy) {
    txSkeleton = await props.referenceLockProxy(txSkeleton);
  }

  // Inject the target cell directly to inputs & outputs
  if (referencedCell) {
    txSkeleton = await props.referenceCell(txSkeleton);
  }

  // Add the target cell as cell dep to cellDeps
  if (addCellToCellDeps) {
    txSkeleton = addCellDep(txSkeleton, {
      outPoint: cell.outPoint!,
      depType: 'code',
    });
  }

  return {
    txSkeleton,
    referencedCell,
    referencedLockProxy,
  };
}
