import { BIish } from '@ckb-lumos/bi';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { Address, OutPoint, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { injectCapacityAndPayFee } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { generateCreateClusterAgentAction, injectCommonCobuildProof } from '../../../cobuild';
import { getClusterProxyByOutPoint, injectNewClusterAgentOutput } from '../..';
import { unpackToRawClusterProxyArgs } from '../../../codec';

export async function createClusterAgent(props: {
  clusterProxyOutPoint: OutPoint;
  referenceType: 'cell' | 'payment';
  paymentAmount?: BIish | ((minPayment: BI) => BIish);
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  clusterProxy?: {
    updateOutput?: (cell: Cell) => Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
  };
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewClusterAgentOutput>>['reference'];
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  const capacityMargin = BI.from(props.capacityMargin ?? 1_0000_0000);

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Get referenced Cluster
  const clusterProxyCell = await getClusterProxyByOutPoint(props.clusterProxyOutPoint, config);

  // Create and inject a new ClusterProxy cell,
  // also inject the referenced Cluster or its LockProxy to the transaction
  const injectNewClusterAgentOutputResult = await injectNewClusterAgentOutput({
    txSkeleton,
    clusterProxyCell,
    referenceType: props.referenceType,
    paymentAmount: props.paymentAmount,
    toLock: props.toLock,
    fromInfos: props.fromInfos,
    changeAddress: props.changeAddress,
    updateOutput: props.updateOutput,
    clusterProxy: props.clusterProxy,
    capacityMargin,
    config,
  });
  txSkeleton = injectNewClusterAgentOutputResult.txSkeleton;

  // Inject needed capacity and pay fee
  const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
    txSkeleton,
    fromInfos: props.fromInfos,
    changeAddress: props.changeAddress,
    updateTxSkeletonAfterCollection(_txSkeleton) {
      // Inject CobuildProof
      const clusterAgentCell = txSkeleton.get('outputs').get(injectNewClusterAgentOutputResult.outputIndex)!;
      const clusterAgentScript = getSporeScript(config, 'ClusterAgent', clusterAgentCell.cellOutput.type!);
      if (clusterAgentScript.behaviors?.cobuild) {
        const actionResult = generateCreateClusterAgentAction({
          txSkeleton: _txSkeleton,
          clusterProxyId: unpackToRawClusterProxyArgs(clusterProxyCell.cellOutput.type!.args).id,
          outputIndex: injectNewClusterAgentOutputResult.outputIndex,
          reference: injectNewClusterAgentOutputResult.reference,
        });
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

  // TODO: validate the referenced ClusterProxy/Payment

  return {
    txSkeleton,
    outputIndex: injectNewClusterAgentOutputResult.outputIndex,
    reference: injectNewClusterAgentOutputResult.reference,
  };
}
