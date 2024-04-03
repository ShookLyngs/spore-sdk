import { BIish } from '@ckb-lumos/bi';
import { Hash, Script, Cell } from '@ckb-lumos/base';
import { BI, helpers, utils } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { unpackToRawMutantArgs } from '../../../codec';
import { minimalCellCapacityByLock } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { getMutantById } from './getMutant';

export async function injectLiveMutantReferences(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  mutantIds: Hash[] | Hash;
  paymentAmount?: (minPayment: BI, lock: Script, cell: Cell) => BIish;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  referenceType: 'payment' | 'none';
  payment?: {
    outputIndices: number[];
  };
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  let txSkeleton = props.txSkeleton;

  // Mutant Ids/Cells
  const mutantIds = Array.isArray(props.mutantIds) ? props.mutantIds : [props.mutantIds];
  const mutantCells = await Promise.all(mutantIds.map((id) => getMutantById(id, config)));

  // Payment cell output indices
  const outputIndices: number[] = [];

  /**
   * Minimal payment amounts to each Mutant's lock script
   *
   * Note that this version of "minimalPaymentsMap" logic could need some notes, take an example:
   * - Creating a Spore that references Mutant 1 and Mutant 2
   * - Mutant 1, lock = A, minPayment = 10 (10^10 shannons, 100 CKB)
   * - Mutant 2, lock = A, minPayment = 11 (10^11 shannons, 1000 CKB)
   * Normally you would expect to pay A 1100 CKB in this transaction:
   * - Minimal payment to A = 100 + 1000 = 1100 CKB
   * But currently the logic is that you only need to pay A 1000 CKB:
   * - Minimal payment to A = max(100, 1000) = 1000 CKB
   */
  const minimalPaymentsMap = mutantCells.reduce(
    (sum, mutantCell) => {
      const mutantLock = mutantCell.cellOutput.lock;
      const mutantLockHash = utils.computeScriptHash(mutantLock);
      if (sum[mutantLockHash] === void 0) {
        sum[mutantLockHash] = {
          cell: mutantCell,
          lock: mutantLock,
          minPayment: BI.from(0),
          minLockCapacity: minimalCellCapacityByLock(mutantLock),
        };
      }

      const args = unpackToRawMutantArgs(mutantCell.cellOutput.type!.args);
      const minPayment = args.minPayment !== void 0 ? BI.from(10).pow(args.minPayment) : BI.from(0);

      // Current logic: max(minPayment1, minPayment2, ...)
      sum[mutantLockHash].minPayment = sum[mutantLockHash].minPayment.gt(minPayment)
        ? sum[mutantLockHash].minPayment
        : minPayment;

      // Alternative logic: sum(minPayment1, minPayment2, ...)
      // sum[mutantLockHash].minPayment = sum[mutantLockHash].minPayment.add(minPayment);

      return sum;
    },
    {} as Record<
      Hash,
      {
        cell: Cell;
        lock: Script;
        minPayment: BI;
        minLockCapacity: BI;
      }
    >,
  );

  // Create payment cells for referencing the Mutants
  for (const info of Object.values(minimalPaymentsMap)) {
    // If no payment required, skip the Mutant
    if (info.minPayment.eq(0)) {
      continue;
    }

    // Calculate how much to pay to the owner of the Mutant
    const requiredPayment = info.minPayment.gt(info.minLockCapacity) ? info.minPayment : info.minLockCapacity;
    const paymentAmount = BI.from(
      props.paymentAmount ? props.paymentAmount(requiredPayment, info.lock, info.cell) : requiredPayment,
    );
    if (paymentAmount.lt(requiredPayment)) {
      throw new Error(
        `Cannot pay to reference Mutant because paymentAmount is too low, required: ${requiredPayment.toString()}, actual: ${paymentAmount.toString()}`,
      );
    }

    // Generate payment cell to the owner of the Mutant
    const outputIndex = txSkeleton.get('outputs').size;
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      outputIndices.push(outputIndex);
      return outputs.push({
        cellOutput: {
          capacity: paymentAmount.toHexString(),
          lock: info.lock,
        },
        data: '0x',
      });
    });
    // Fix the payment cell's output index to prevent it from future reduction
    txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
      return fixedEntries.push({
        field: 'outputs',
        index: outputIndex,
      });
    });
  }

  // Add Mutant's type as cellDep
  const mutantScript = getSporeScript(config, 'Mutant');
  txSkeleton = addCellDep(txSkeleton, mutantScript.cellDep);

  // Add Mutant cells as cellDeps
  for (const mutantCell of mutantCells) {
    txSkeleton = addCellDep(txSkeleton, {
      outPoint: mutantCell.outPoint!,
      depType: 'code',
    });
  }

  return {
    txSkeleton,
    referenceType: outputIndices.length > 0 ? 'payment' : 'none',
    payment: outputIndices.length > 0 ? { outputIndices } : void 0,
  };
}
