import { BIish } from '@ckb-lumos/bi';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { Address, OutPoint, PackedSince, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { injectCapacityAndPayFee, payFeeByOutput } from '../../../helpers';
import { getSporeByOutPoint, injectLiveSporeCell } from '../..';
import { generateTransferSporeAction, injectCommonCobuildProof } from '../../../cobuild';

export async function transferSpore(props: {
  outPoint: OutPoint;
  toLock: Script;
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
  if (!useCapacityMarginAsFee && !props.fromInfos) {
    throw new Error('When useCapacityMarginAsFee is enabled, fromInfos is also required');
  }
  if (useCapacityMarginAsFee && props.capacityMargin !== void 0) {
    throw new Error('When useCapacityMarginAsFee is enabled, cannot set capacity margin of the spore');
  }

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Inject live spore to Transaction.inputs and Transaction.outputs
  const sporeCell = await getSporeByOutPoint(props.outPoint, config);
  const sporeScript = getSporeScript(config, 'Spore', sporeCell.cellOutput.type!);
  const injectLiveSporeCellResult = await injectLiveSporeCell({
    txSkeleton,
    cell: sporeCell,
    addOutput: true,
    updateOutput(cell) {
      cell.cellOutput.lock = props.toLock;
      if (props.updateOutput instanceof Function) {
        cell = props.updateOutput(cell);
      }
      return cell;
    },
    capacityMargin: props.capacityMargin,
    defaultWitness: props.defaultWitness,
    updateWitness: props.updateWitness,
    since: props.since,
    config,
  });
  txSkeleton = injectLiveSporeCellResult.txSkeleton;

  // Generate TransferSpore actions
  const actionResult = generateTransferSporeAction({
    txSkeleton,
    inputIndex: injectLiveSporeCellResult.inputIndex,
    outputIndex: injectLiveSporeCellResult.outputIndex,
  });

  if (!useCapacityMarginAsFee) {
    // Inject needed capacity from fromInfos and pay fee
    const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
      txSkeleton,
      fromInfos: props.fromInfos!,
      changeAddress: props.changeAddress,
      updateTxSkeletonAfterCollection(_txSkeleton) {
        // Inject CobuildProof
        if (sporeScript.behaviors?.cobuild) {
          const injectCobuildProofResult = injectCommonCobuildProof({
            txSkeleton: _txSkeleton,
            actions: actionResult.actions,
          });
          _txSkeleton = injectCobuildProofResult.txSkeleton;
        }

        return _txSkeleton;
      },
      config,
    });
    txSkeleton = injectCapacityAndPayFeeResult.txSkeleton;
  } else {
    // Inject CobuildProof
    if (sporeScript.behaviors?.cobuild) {
      const injectCobuildProofResult = injectCommonCobuildProof({
        txSkeleton: txSkeleton,
        actions: actionResult.actions,
      });
      txSkeleton = injectCobuildProofResult.txSkeleton;
    }

    // Pay fee by the spore cell's capacity margin
    txSkeleton = await payFeeByOutput({
      outputIndex: injectLiveSporeCellResult.outputIndex,
      txSkeleton,
      config,
    });
  }

  return {
    txSkeleton,
    inputIndex: injectLiveSporeCellResult.inputIndex,
    outputIndex: injectLiveSporeCellResult.outputIndex,
  };
}
