import { BIish } from '@ckb-lumos/bi';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { Address, OutPoint, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { injectCapacityAndPayFee, assertTransactionSkeletonSize, injectNeededCapacity } from '../../../helpers';
import { SporeDataProps, injectNewSporeOutput, injectNewSporeIds, getClusterAgentByOutPoint } from '../..';
import { generateCreateSporeAction, injectCommonCobuildProof } from '../../../cobuild';

export async function createSpore(props: {
  data: SporeDataProps;
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  cluster?: {
    updateOutput?: (cell: Cell) => Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
  };
  clusterAgentOutPoint?: OutPoint;
  clusterAgent?: {
    updateOutput?: (cell: Cell) => Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
  };
  mutant?: {
    paymentAmount?: (minPayment: BI, lock: Script, cell: Cell) => BIish;
  };
  maxTransactionSize?: number | false;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewSporeOutput>>['reference'];
  mutantReference: Awaited<ReturnType<typeof injectNewSporeOutput>>['mutantReference'];
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

  // If referencing a ClusterAgent, get it from the OutPoint
  let clusterAgentCell: Cell | undefined;
  if (props.clusterAgentOutPoint) {
    clusterAgentCell = await getClusterAgentByOutPoint(props.clusterAgentOutPoint, config);
  }

  // Create and inject a new spore cell, also inject cluster if exists
  const injectNewSporeResult = await injectNewSporeOutput({
    txSkeleton,
    data: props.data,
    toLock: props.toLock,
    fromInfos: props.fromInfos,
    changeAddress: props.changeAddress,
    updateOutput: props.updateOutput,
    clusterAgent: props.clusterAgent,
    cluster: props.cluster,
    mutant: props.mutant,
    clusterAgentCell,
    capacityMargin,
    config,
  });
  txSkeleton = injectNewSporeResult.txSkeleton;

  // Inject needed capacity and pay fee
  const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
    txSkeleton,
    fromInfos: props.fromInfos,
    changeAddress: props.changeAddress,
    updateTxSkeletonAfterCollection(_txSkeleton) {
      // Generate and inject SporeID
      _txSkeleton = injectNewSporeIds({
        outputIndices: [injectNewSporeResult.outputIndex],
        txSkeleton: _txSkeleton,
        config,
      });

      // Inject CobuildProof
      const sporeCell = txSkeleton.get('outputs').get(injectNewSporeResult.outputIndex)!;
      const sporeScript = getSporeScript(config, 'Spore', sporeCell.cellOutput.type!);
      if (sporeScript.behaviors?.cobuild) {
        const actionResult = generateCreateSporeAction({
          txSkeleton: _txSkeleton,
          reference: injectNewSporeResult.reference,
          outputIndex: injectNewSporeResult.outputIndex,
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

  // TODO: If creating a clustered spore, validate the transaction

  // Make sure the tx size is in range (if needed)
  if (typeof maxTransactionSize === 'number') {
    assertTransactionSkeletonSize(txSkeleton, void 0, maxTransactionSize);
  }

  return {
    txSkeleton,
    outputIndex: injectNewSporeResult.outputIndex,
    reference: injectNewSporeResult.reference,
    mutantReference: injectNewSporeResult.mutantReference,
  };
}
