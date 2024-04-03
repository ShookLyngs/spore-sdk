import { BIish } from '@ckb-lumos/bi';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { Address, OutPoint, PackedSince, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { getSporeConfig, SporeConfig } from '../../../config';
import { injectCapacityAndPayFee, payFeeByOutput } from '../../../helpers';
import { getMutantByOutPoint, injectLiveMutantCell } from '../..';

export async function transferMutant(props: {
  outPoint: OutPoint;
  toLock: Script;
  minPayment?: BIish;
  fromInfos?: FromInfo[];
  changeAddress?: Address;
  useCapacityMarginAsFee?: boolean;
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
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  const useCapacityMarginAsFee = props.useCapacityMarginAsFee ?? true;

  // Check capacity margin related props
  if (!useCapacityMarginAsFee && !props.fromInfos?.length) {
    throw new Error('When useCapacityMarginAsFee is enabled, fromInfos is also required');
  }
  if (useCapacityMarginAsFee && props.capacityMargin !== void 0) {
    throw new Error('When useCapacityMarginAsFee is enabled, cannot set capacityMargin of the cell');
  }

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Find Mutant by OutPoint
  const mutantCell = await getMutantByOutPoint(props.outPoint, config);

  // Add Mutant to inputs and outputs of the Transaction
  const injectLiveMutantCellResult = await injectLiveMutantCell({
    txSkeleton,
    cell: mutantCell,
    addOutput: true,
    updateOutput(cell) {
      cell.cellOutput.lock = props.toLock;
      if (props.updateOutput instanceof Function) {
        cell = props.updateOutput(cell);
      }
      return cell;
    },
    minPayment: props.minPayment,
    capacityMargin: props.capacityMargin,
    defaultWitness: props.defaultWitness,
    updateWitness: props.updateWitness,
    since: props.since,
    config,
  });
  txSkeleton = injectLiveMutantCellResult.txSkeleton;

  if (!useCapacityMarginAsFee) {
    // Inject needed capacity and pay fee
    const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
      txSkeleton,
      changeAddress: props.changeAddress,
      fromInfos: props.fromInfos!,
      config,
    });
    txSkeleton = injectCapacityAndPayFeeResult.txSkeleton;
  } else {
    // Pay fee by the target cell's capacity margin
    txSkeleton = await payFeeByOutput({
      outputIndex: injectLiveMutantCellResult.outputIndex,
      txSkeleton,
      config,
    });
  }

  return {
    txSkeleton,
    inputIndex: injectLiveMutantCellResult.inputIndex,
    outputIndex: injectLiveMutantCellResult.outputIndex,
  };
}
