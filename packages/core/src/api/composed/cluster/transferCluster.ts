import { BIish } from '@ckb-lumos/bi';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { Address, OutPoint, PackedSince, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { injectCapacityAndPayFee, payFeeByOutput } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { generateTransferClusterAction, injectCommonCobuildProof } from '../../../cobuild';
import { getClusterByOutPoint, injectLiveClusterCell } from '../..';

export async function transferCluster(props: {
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
  if (!useCapacityMarginAsFee && !props.fromInfos?.length) {
    throw new Error('When useCapacityMarginAsFee is enabled, fromInfos is also required');
  }
  if (useCapacityMarginAsFee && props.capacityMargin !== void 0) {
    throw new Error('When useCapacityMarginAsFee is enabled, cannot set capacityMargin of the cluster');
  }

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Find Cluster by OutPoint
  const clusterCell = await getClusterByOutPoint(props.outPoint, config);
  const clusterScript = getSporeScript(config, 'Cluster', clusterCell.cellOutput.type!);

  // Add Cluster to inputs and outputs of the Transaction
  const injectLiveClusterCellResult = await injectLiveClusterCell({
    txSkeleton,
    cell: clusterCell,
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
  txSkeleton = injectLiveClusterCellResult.txSkeleton;

  // Generate TransferSpore actions
  const actionResult = generateTransferClusterAction({
    txSkeleton,
    inputIndex: injectLiveClusterCellResult.inputIndex,
    outputIndex: injectLiveClusterCellResult.outputIndex,
  });

  if (!useCapacityMarginAsFee) {
    // Inject needed capacity and pay fee
    const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
      txSkeleton,
      fromInfos: props.fromInfos!,
      changeAddress: props.changeAddress,
      updateTxSkeletonAfterCollection(_txSkeleton) {
        // Inject CobuildProof
        if (clusterScript.behaviors?.cobuild) {
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
    if (clusterScript.behaviors?.cobuild) {
      const injectCobuildProofResult = injectCommonCobuildProof({
        txSkeleton: txSkeleton,
        actions: actionResult.actions,
      });
      txSkeleton = injectCobuildProofResult.txSkeleton;
    }

    // Pay fee by the cluster cell's capacity margin
    txSkeleton = await payFeeByOutput({
      outputIndex: injectLiveClusterCellResult.outputIndex,
      txSkeleton,
      config,
    });
  }

  return {
    txSkeleton,
    inputIndex: injectLiveClusterCellResult.inputIndex,
    outputIndex: injectLiveClusterCellResult.outputIndex,
  };
}
