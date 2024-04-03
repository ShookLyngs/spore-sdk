import { Address, OutPoint } from '@ckb-lumos/base';
import { helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { returnExceededCapacityAndPayFee } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { generateMeltClusterAgentAction, injectCommonCobuildProof } from '../../../cobuild';
import { getClusterAgentByOutPoint, injectLiveClusterAgentCell } from '../..';

export async function meltClusterAgent(props: {
  outPoint: OutPoint;
  changeAddress?: Address;
  updateWitness?: HexString | ((witness: HexString) => HexString);
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Get ClusterAgent cell
  const clusterAgentCell = await getClusterAgentByOutPoint(props.outPoint, config);
  const clusterAgentScript = getSporeScript(config, 'ClusterAgent', clusterAgentCell.cellOutput.type!);

  // Inject target cell to Transaction.inputs
  const injectLiveClusterAgentCellResult = await injectLiveClusterAgentCell({
    txSkeleton,
    cell: clusterAgentCell,
    updateWitness: props.updateWitness,
    config,
  });
  txSkeleton = injectLiveClusterAgentCellResult.txSkeleton;

  // Inject CobuildProof
  if (clusterAgentScript.behaviors?.cobuild) {
    const actionResult = generateMeltClusterAgentAction({
      txSkeleton,
      inputIndex: injectLiveClusterAgentCellResult.inputIndex,
    });
    const injectCobuildProofResult = injectCommonCobuildProof({
      txSkeleton,
      actions: actionResult.actions,
    });
    txSkeleton = injectCobuildProofResult.txSkeleton;
  }

  // Redeem occupied capacity from the melted cell
  const targetCellAddress = helpers.encodeToAddress(clusterAgentCell.cellOutput.lock, { config: config.lumos });
  const returnExceededCapacityAndPayFeeResult = await returnExceededCapacityAndPayFee({
    changeAddress: props.changeAddress ?? targetCellAddress,
    txSkeleton,
    config,
  });
  txSkeleton = returnExceededCapacityAndPayFeeResult.txSkeleton;

  return {
    txSkeleton,
    inputIndex: injectLiveClusterAgentCellResult.inputIndex,
  };
}
