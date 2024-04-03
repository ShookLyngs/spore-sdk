import { BIish } from '@ckb-lumos/bi';
import { Address, Script } from '@ckb-lumos/base';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { BI, Cell, helpers, Indexer } from '@ckb-lumos/lumos';
import { RawClusterData } from '../../../codec';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { generateCreateClusterAction, injectCommonCobuildProof } from '../../../cobuild';
import { injectCapacityAndPayFee, assertTransactionSkeletonSize } from '../../../helpers';
import { injectNewClusterIds, injectNewClusterOutput } from '../..';

export async function createCluster(props: {
  data: RawClusterData;
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  maxTransactionSize?: number | false;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  const capacityMargin = BI.from(props.capacityMargin ?? 1_0000_0000);
  const maxTransactionSize = props.maxTransactionSize ?? config.maxTransactionSize ?? false;

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Generate and inject Cluster cell
  const injectNewClusterResult = injectNewClusterOutput({
    txSkeleton,
    data: props.data,
    toLock: props.toLock,
    updateOutput: props.updateOutput,
    capacityMargin,
    config,
  });
  txSkeleton = injectNewClusterResult.txSkeleton;

  // Inject needed capacity and pay fee
  const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
    txSkeleton,
    fromInfos: props.fromInfos,
    changeAddress: props.changeAddress,
    updateTxSkeletonAfterCollection(_txSkeleton) {
      // Generate ID for the new Cluster (if possible)
      _txSkeleton = injectNewClusterIds({
        txSkeleton: _txSkeleton,
        outputIndices: [injectNewClusterResult.outputIndex],
        config,
      });

      // Inject CobuildProof
      const clusterCell = txSkeleton.get('outputs').get(injectNewClusterResult.outputIndex)!;
      const clusterScript = getSporeScript(config, 'Cluster', clusterCell.cellOutput.type!);
      if (clusterScript.behaviors?.cobuild) {
        const actionResult = generateCreateClusterAction({
          txSkeleton: _txSkeleton,
          outputIndex: injectNewClusterResult.outputIndex,
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

  // Make sure the tx size is in range (if needed)
  if (typeof maxTransactionSize === 'number') {
    assertTransactionSkeletonSize(txSkeleton, void 0, maxTransactionSize);
  }

  return {
    txSkeleton,
    outputIndex: injectNewClusterResult.outputIndex,
  };
}
