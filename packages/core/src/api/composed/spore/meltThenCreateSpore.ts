import { Address, OutPoint, PackedSince, Script } from '@ckb-lumos/base';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { BI, BIish, Cell, helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { SporeDataProps, injectNewSporeOutput, injectNewSporeIds, getClusterAgentByOutPoint } from '../..';
import { getSporeByOutPoint, injectLiveSporeCell } from '../..';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { List } from 'immutable';

export async function meltAndCreateSpore(props: {
  outPoint: OutPoint;
  changeAddress?: Address;
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
  data: SporeDataProps;
  toLock: Script;
  fromInfos: FromInfo[];
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
}) /**
: Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewSporeOutput>>['reference'];
  mutantReference: Awaited<ReturnType<typeof injectNewSporeOutput>>['mutantReference'];
}> 
 */
{
  /**
   * Melt Spore with Spore Outputpoint
   */

  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  const capacityMargin = BI.from(props.capacityMargin ?? 1_0000_0000);
  const maxTransactionSize = props.maxTransactionSize ?? config.maxTransactionSize ?? false;

  // MeltTransactionSkeleton
  let meltTxSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Inject live spore to Transaction.inputs
  const sporeCell = await getSporeByOutPoint(props.outPoint, config);
  const injectLiveSporeCellResult = await injectLiveSporeCell({
    txSkeleton: meltTxSkeleton,
    cell: sporeCell,
    updateWitness: props.updateWitness,
    defaultWitness: props.defaultWitness,
    since: props.since,
    config,
  });
  meltTxSkeleton = injectLiveSporeCellResult.txSkeleton;
  console.log(JSON.stringify(meltTxSkeleton));

  /**
   * Create Spore
   */

  // If referencing a ClusterAgent, get it from the OutPoint

  // CreateTransactionSkeleton
  // let createTxSkeleton = helpers.TransactionSkeleton({
  //    cellProvider: indexer,
  // });

  let clusterAgentCell: Cell | undefined;
  if (props.clusterAgentOutPoint) {
    clusterAgentCell = await getClusterAgentByOutPoint(props.clusterAgentOutPoint, config);
  }

  const injectNewSporeResult = await injectNewSporeOutput({
    txSkeleton: meltTxSkeleton,
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
  meltTxSkeleton = injectNewSporeResult.txSkeleton;
  console.log(JSON.stringify(meltTxSkeleton));
}
