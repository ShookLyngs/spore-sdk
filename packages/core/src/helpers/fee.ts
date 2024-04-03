import { BIish } from '@ckb-lumos/bi';
import { BI, helpers, RPC } from '@ckb-lumos/lumos';
import { common, FromInfo } from '@ckb-lumos/common-scripts';
import { Address, Header, Transaction } from '@ckb-lumos/base';
import { getSporeConfig, SporeConfig } from '../config';
import { injectNeededCapacity, returnExceededCapacity } from './capacity';
import { CapacitySnapshot, createCapacitySnapshotFromTransactionSkeleton } from './capacity';
import { getTransactionSize, getTransactionSkeletonSize } from './transaction';

/**
 * Get minimal acceptable fee rate from RPC.
 */
export async function getMinFeeRate(rpc: RPC | string): Promise<BI> {
  rpc = typeof rpc === 'string' ? new RPC(rpc) : rpc;
  const info = await rpc.txPoolInfo();
  return BI.from(info.minFeeRate);
}

/**
 * Calculate transaction fee by transaction's byte size and feeRate.
 */
export function calculateFee(size: number, feeRate: BIish): BI {
  const ratio = BI.from(1000);
  const base = BI.from(size).mul(feeRate);
  const fee = base.div(ratio);
  if (fee.mul(ratio).lt(base)) {
    return fee.add(1);
  }
  return BI.from(fee);
}

/**
 * Calculate transaction fee by Transaction and a specific feeRate.
 */
export function calculateFeeByTransaction(tx: Transaction, feeRate: BIish): BI {
  const size = getTransactionSize(tx);
  return calculateFee(size, feeRate);
}

/**
 * Calculate transaction fee by TransactionSkeleton and a specific feeRate.
 */
export function calculateFeeByTransactionSkeleton(txSkeleton: helpers.TransactionSkeletonType, feeRate: BIish): BI {
  const tx = helpers.createTransactionFromSkeleton(txSkeleton);
  return calculateFeeByTransaction(tx, feeRate);
}

/**
 * Pay transaction fee via a capacity collection process,
 * using the minimal acceptable fee rate from the RPC.
 */
export async function payFeeThroughCollection(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  feeRate?: BIish;
  tipHeader?: Header;
  enableDeductCapacity?: boolean;
  useLocktimeCellsFirst?: boolean;
  updateTxSkeletonAfterCollection?: (
    txSkeleton: helpers.TransactionSkeletonType,
  ) => Promise<helpers.TransactionSkeletonType> | helpers.TransactionSkeletonType;
  config?: SporeConfig;
}): Promise<helpers.TransactionSkeletonType> {
  // Env
  const config = props.config ?? getSporeConfig();
  const feeRate = props.feeRate ?? (await getMinFeeRate(config.ckbNodeUrl));

  let size = 0;
  let newTxSkeleton = props.txSkeleton;

  /**
   * Loop the collection process until the transaction size is no longer increasing.
   * This is to ensure that the transaction size is as small as possible.
   */
  let currentTransactionSize = getTransactionSkeletonSize(newTxSkeleton);
  while (currentTransactionSize > size) {
    size = currentTransactionSize;
    const fee = calculateFee(size, feeRate);

    newTxSkeleton = await common.injectCapacity(
      props.txSkeleton,
      props.fromInfos,
      fee,
      props.changeAddress,
      props.tipHeader,
      {
        config: config.lumos,
        enableDeductCapacity: props.enableDeductCapacity,
        useLocktimeCellsFirst: props.useLocktimeCellsFirst,
      },
    );

    /**
     * When injection is made and has passed the "updateTxSkeletonUpdateCollection" function,
     * the function will be called to update the TransactionSkeleton as needed.
     */
    if (props.updateTxSkeletonAfterCollection) {
      newTxSkeleton = await props.updateTxSkeletonAfterCollection(newTxSkeleton);
    }

    currentTransactionSize = getTransactionSkeletonSize(newTxSkeleton);
  }

  return newTxSkeleton;
}

/**
 * Specify an output to pay transaction fee.
 */
export async function payFeeByOutput(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  feeRate?: BIish;
  config?: SporeConfig;
}): Promise<helpers.TransactionSkeletonType> {
  // Env
  const config = props.config ?? getSporeConfig();
  const feeRate = props.feeRate ?? (await getMinFeeRate(config.ckbNodeUrl));

  // Get TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Get target output cell
  let outputs = txSkeleton.get('outputs');
  const output = outputs.get(props.outputIndex);
  if (!output) {
    throw new Error(`Cannot pay fee by Transaction.outputs[${props.outputIndex}] because it does not exist`);
  }

  // Check can pay fee with capacity margin
  const minimalCellCapacity = helpers.minimalCellCapacityCompatible(output);
  const outputCapacity = BI.from(output.cellOutput.capacity);
  const capacityMargin = outputCapacity.sub(minimalCellCapacity);
  const fee = calculateFeeByTransactionSkeleton(txSkeleton, feeRate);
  if (capacityMargin.lt(fee)) {
    throw new Error(`Cannot pay fee by Transaction.outputs[${props.outputIndex}] due to insufficient capacity`);
  }

  // Pay fee and update capacity
  output.cellOutput.capacity = outputCapacity.sub(fee).toHexString();
  outputs = outputs.set(props.outputIndex, output);
  return txSkeleton.set('outputs', outputs);
}

/**
 * Inject the needed amount of capacity,
 * and then pay the transaction fee via a capacity collection process.
 */
export async function injectCapacityAndPayFee(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  fromInfos: FromInfo[];
  config?: SporeConfig;
  feeRate?: BIish;
  extraCapacity?: BIish;
  changeAddress?: Address;
  enableDeductCapacity?: boolean;
  updateTxSkeletonAfterCollection?: (
    txSkeleton: helpers.TransactionSkeletonType,
  ) => Promise<helpers.TransactionSkeletonType> | helpers.TransactionSkeletonType;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  before: CapacitySnapshot;
  after: CapacitySnapshot;
}> {
  // Env
  const config = props.config ?? getSporeConfig();

  // Collect capacity
  const injectNeededCapacityResult = await injectNeededCapacity({
    ...props,
    config: config.lumos,
  });

  // Pay fee
  const txSkeleton = await payFeeThroughCollection({
    ...props,
    txSkeleton: injectNeededCapacityResult.txSkeleton,
  });

  return {
    txSkeleton,
    before: injectNeededCapacityResult.before,
    after: createCapacitySnapshotFromTransactionSkeleton(txSkeleton),
  };
}

/**
 * Return exceeded capacity (change) to the outputs and then pay fee by the change cell.
 */
export async function returnExceededCapacityAndPayFee(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  changeAddress: Address;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  changeCellOutputIndex: number;
  createdChangeCell: boolean;
}> {
  let txSkeleton = props.txSkeleton;
  const config = props.config ?? getSporeConfig();

  // Return exceeded (change) capacity
  const returnExceededCapacityResult = returnExceededCapacity({
    txSkeleton,
    config: config.lumos,
    changeAddress: props.changeAddress,
  });
  txSkeleton = returnExceededCapacityResult.txSkeleton;

  // If no change was returned, throw error as it is unexpected
  if (!returnExceededCapacityResult.returnedChange) {
    throw new Error(`Cannot pay fee with change cell because no change was returned`);
  }

  // Pay fee by change cell in outputs
  txSkeleton = await payFeeByOutput({
    outputIndex: returnExceededCapacityResult.changeCellOutputIndex,
    txSkeleton,
    config,
  });

  return {
    txSkeleton,
    createdChangeCell: returnExceededCapacityResult.createdChangeCell,
    changeCellOutputIndex: returnExceededCapacityResult.changeCellOutputIndex,
  };
}
