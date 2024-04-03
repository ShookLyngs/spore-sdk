import { BIish } from '@ckb-lumos/bi';
import { PackedSince, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { referenceCellOrLockProxy } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { injectLiveClusterAgentCell } from './injectLiveClusterAgentCell';

export async function injectLiveClusterAgentReference(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  cell: Cell;
  inputLocks: Script[];
  outputLocks: Script[];
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  referenceType: 'cell' | 'lockProxy';
  clusterAgent?: {
    inputIndex: number;
    outputIndex: number;
  };
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  let txSkeleton = props.txSkeleton;

  // Get ClusterAgent cell
  const clusterAgentCell = props.cell;
  if (!clusterAgentCell.outPoint) {
    throw new Error(`Cannot inject ClusterAgent as reference because target cell has no OutPoint`);
  }

  // Inject reference cell or LockProxy
  let injectLiveClusterAgentResult: Awaited<ReturnType<typeof injectLiveClusterAgentCell>> | undefined;
  const referenceResult = await referenceCellOrLockProxy({
    txSkeleton,
    cell: clusterAgentCell,
    inputLocks: props.inputLocks,
    outputLocks: props.outputLocks,
    async referenceCell(tx) {
      injectLiveClusterAgentResult = await injectLiveClusterAgentCell({
        txSkeleton: tx,
        cell: clusterAgentCell,
        addOutput: true,
        updateOutput: props.updateOutput,
        updateWitness: props.updateWitness,
        capacityMargin: props.capacityMargin,
        defaultWitness: props.defaultWitness,
        since: props.since,
        config,
      });

      return injectLiveClusterAgentResult.txSkeleton;
    },
    referenceLockProxy(tx) {
      const cellType = clusterAgentCell.cellOutput.type;
      const clusterAgentScript = getSporeScript(config, 'ClusterAgent', cellType!);
      if (!clusterAgentScript.behaviors?.lockProxy) {
        throw new Error('Cannot reference ClusterAgent because target cell does not supported lockProxy');
      }

      // Add ClusterAgent required cellDeps
      tx = addCellDep(tx, clusterAgentScript.cellDep);

      return tx;
    },
  });
  txSkeleton = referenceResult.txSkeleton;

  return {
    txSkeleton,
    referenceType: referenceResult.referencedCell ? 'cell' : 'lockProxy',
    clusterAgent:
      referenceResult.referencedCell && injectLiveClusterAgentResult !== void 0
        ? {
            inputIndex: injectLiveClusterAgentResult.inputIndex,
            outputIndex: injectLiveClusterAgentResult.outputIndex,
          }
        : void 0,
  };
}
