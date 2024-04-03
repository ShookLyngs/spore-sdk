import { Address, OutPoint } from '@ckb-lumos/base';
import { helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { returnExceededCapacityAndPayFee } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { generateMeltClusterProxyAction, injectCommonCobuildProof } from '../../../cobuild';
import { getClusterProxyByOutPoint, injectLiveClusterProxyCell } from '../..';

export async function meltClusterProxy(props: {
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

  // Get ClusterProxy cell
  const clusterProxyCell = await getClusterProxyByOutPoint(props.outPoint, config);
  const clusterProxyScript = getSporeScript(config, 'ClusterProxy', clusterProxyCell.cellOutput.type!);

  // Inject live spore to Transaction.inputs
  const injectLiveClusterProxyCellResult = await injectLiveClusterProxyCell({
    txSkeleton,
    cell: clusterProxyCell,
    updateWitness: props.updateWitness,
    config,
  });
  txSkeleton = injectLiveClusterProxyCellResult.txSkeleton;

  // Inject CobuildProof
  if (clusterProxyScript.behaviors?.cobuild) {
    const actionResult = generateMeltClusterProxyAction({
      txSkeleton,
      inputIndex: injectLiveClusterProxyCellResult.inputIndex,
    });
    const injectCobuildProofResult = injectCommonCobuildProof({
      txSkeleton,
      actions: actionResult.actions,
    });
    txSkeleton = injectCobuildProofResult.txSkeleton;
  }

  // Redeem occupied capacity from the melted cell
  const targetCellAddress = helpers.encodeToAddress(clusterProxyCell.cellOutput.lock, { config: config.lumos });
  const returnExceededCapacityAndPayFeeResult = await returnExceededCapacityAndPayFee({
    changeAddress: props.changeAddress ?? targetCellAddress,
    txSkeleton,
    config,
  });
  txSkeleton = returnExceededCapacityAndPayFeeResult.txSkeleton;

  return {
    txSkeleton,
    inputIndex: injectLiveClusterProxyCellResult.inputIndex,
  };
}
