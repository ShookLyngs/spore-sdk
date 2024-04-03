import { BIish } from '@ckb-lumos/bi';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { Address, OutPoint, PackedSince, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { injectCapacityAndPayFee, payFeeByOutput } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { generateTransferClusterAgentAction, injectCommonCobuildProof } from '../../../cobuild';
import { getClusterAgentByOutPoint, injectLiveClusterAgentCell } from '../..';

export async function transferClusterAgent(props: {
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
    throw new Error('When useCapacityMarginAsFee is enabled, cannot update capacityMargin of the cell');
  }

  // Get TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Get target ClusterAgent cell
  const clusterAgentCell = await getClusterAgentByOutPoint(props.outPoint, config);
  const clusterAgentScript = getSporeScript(config, 'ClusterAgent', clusterAgentCell.cellOutput.type!);

  // Inject live ClusterProxy cell to inputs/outputs of the Transaction
  const injectLiveClusterAgentCellResult = await injectLiveClusterAgentCell({
    txSkeleton,
    cell: clusterAgentCell,
    addOutput: true,
    updateOutput(cell) {
      cell.cellOutput.lock = props.toLock;
      if (props.updateOutput instanceof Function) {
        cell = props.updateOutput(cell);
      }
      return cell;
    },
    capacityMargin: props.capacityMargin,
    updateWitness: props.updateWitness,
    defaultWitness: props.defaultWitness,
    since: props.since,
    config,
  });
  txSkeleton = injectLiveClusterAgentCellResult.txSkeleton;

  // Generate TransferClusterAgent actions
  const actionResult = generateTransferClusterAgentAction({
    txSkeleton,
    inputIndex: injectLiveClusterAgentCellResult.inputIndex,
    outputIndex: injectLiveClusterAgentCellResult.outputIndex,
  });

  if (!useCapacityMarginAsFee) {
    // Inject needed capacity from fromInfos and pay fee
    const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
      txSkeleton,
      fromInfos: props.fromInfos!,
      changeAddress: props.changeAddress,
      updateTxSkeletonAfterCollection(_txSkeleton) {
        // Inject CobuildProof
        if (clusterAgentScript.behaviors?.cobuild) {
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
    if (clusterAgentScript.behaviors?.cobuild) {
      const injectCobuildProofResult = injectCommonCobuildProof({
        txSkeleton,
        actions: actionResult.actions,
      });
      txSkeleton = injectCobuildProofResult.txSkeleton;
    }
    // Pay fee by the target cell's capacity margin
    txSkeleton = await payFeeByOutput({
      txSkeleton,
      outputIndex: injectLiveClusterAgentCellResult.outputIndex,
      config,
    });
  }

  return {
    txSkeleton,
    inputIndex: injectLiveClusterAgentCellResult.inputIndex,
    outputIndex: injectLiveClusterAgentCellResult.outputIndex,
  };
}
