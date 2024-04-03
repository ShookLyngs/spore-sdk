import { BIish } from '@ckb-lumos/bi';
import { BI, Cell, helpers, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { assetCellMinimalCapacity, minimalCellCapacityByLock } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { injectLiveClusterProxyCell } from './injectLiveClusterProxyCell';
import { unpackToRawClusterProxyArgs } from '../../../codec';

export async function injectLiveClusterProxyReference(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  cell: Cell;
  referenceType: 'cell' | 'payment';
  paymentAmount?: BIish | ((minPayment: BI) => BIish);
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  updateOutput?: (cell: Cell) => Cell;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  referenceType: 'cell' | 'payment';
  clusterProxy?: {
    inputIndex: number;
    outputIndex: number;
  };
  payment?: {
    outputIndex: number;
  };
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const isPaying = props.referenceType === 'payment';

  // TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Get ClusterProxy cell
  const clusterProxyCell = props.cell;
  if (!clusterProxyCell.outPoint) {
    throw new Error(`Cannot inject ClusterProxy as reference because target cell has no OutPoint`);
  }

  // Get ClusterProxy's type script
  const clusterProxyType = clusterProxyCell.cellOutput.type;
  const clusterProxyScript = getSporeScript(config, 'ClusterProxy', clusterProxyType!);
  if (!clusterProxyType || !clusterProxyScript) {
    throw new Error('Cannot inject ClusterProxy because target cell is not a supported version of ClusterProxy');
  }

  // Method #1: Paying capacity to the owner of the referenced ClusterProxy
  let paymentCellOutputIndex: number | undefined;
  if (isPaying) {
    const clusterProxyArgs = unpackToRawClusterProxyArgs(clusterProxyType.args);
    const minPayment =
      clusterProxyArgs.minPayment !== void 0 ? BI.from(10).pow(clusterProxyArgs.minPayment) : BI.from(0);
    if (minPayment.lte(0)) {
      throw new Error('Cannot pay to reference ClusterProxy because minPayment is undefined');
    }

    const minCellCapacity = minimalCellCapacityByLock(clusterProxyCell.cellOutput.lock);
    const requiredPayment = minPayment.gt(minCellCapacity) ? minPayment : minCellCapacity;
    const paymentAmount = BI.from(
      props.paymentAmount
        ? props.paymentAmount instanceof Function
          ? props.paymentAmount(requiredPayment)
          : props.paymentAmount
        : requiredPayment,
    );
    if (paymentAmount.lt(requiredPayment)) {
      throw new Error(
        `Cannot pay to reference ClusterProxy because paymentAmount is too low, required: ${requiredPayment.toString()}, actual: ${paymentAmount.toString()}`,
      );
    }

    const paymentCell: Cell = {
      cellOutput: {
        capacity: paymentAmount.toHexString(),
        lock: clusterProxyCell.cellOutput.lock,
      },
      data: '0x',
    };

    // Make sure the declared capacity is enough
    assetCellMinimalCapacity(paymentCell);

    // Add the payment cell to outputs
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      paymentCellOutputIndex = outputs.size;
      return outputs.push(paymentCell);
    });

    // Fix the payment cell's output index to prevent it from future reduction
    txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
      return fixedEntries.push({
        field: 'outputs',
        index: paymentCellOutputIndex!,
      });
    });
  }

  // Method #2: Reference the ClusterProxy directly into inputs/outputs
  let injectLiveClusterResult: Awaited<ReturnType<typeof injectLiveClusterProxyCell>> | undefined;
  if (!isPaying) {
    injectLiveClusterResult = await injectLiveClusterProxyCell({
      txSkeleton: txSkeleton,
      cell: clusterProxyCell,
      updateOutput: props.updateOutput,
      updateWitness: props.updateWitness,
      capacityMargin: props.capacityMargin,
      addOutput: true,
      config,
    });
    txSkeleton = injectLiveClusterResult.txSkeleton;

    // Fix the referenced cell's output index to prevent it from future reduction
    txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
      return fixedEntries.push({
        field: 'outputs',
        index: injectLiveClusterResult!.outputIndex,
      });
    });
  }

  // Add ClusterProxy relevant cellDeps
  txSkeleton = addCellDep(txSkeleton, clusterProxyScript.cellDep);
  txSkeleton = addCellDep(txSkeleton, {
    outPoint: clusterProxyCell.outPoint!,
    depType: 'code',
  });

  return {
    txSkeleton,
    referenceType: isPaying ? 'payment' : 'cell',
    clusterProxy:
      !isPaying && injectLiveClusterResult
        ? {
            inputIndex: injectLiveClusterResult.inputIndex,
            outputIndex: injectLiveClusterResult.outputIndex,
          }
        : void 0,
    payment: isPaying
      ? {
          outputIndex: paymentCellOutputIndex!,
        }
      : void 0,
  };
}
