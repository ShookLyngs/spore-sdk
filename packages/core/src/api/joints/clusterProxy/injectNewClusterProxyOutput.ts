import { BIish } from '@ckb-lumos/bi';
import { bytes } from '@ckb-lumos/codec';
import { Address, Script } from '@ckb-lumos/base';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { BI, Cell, helpers, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { packRawClusterProxyArgs } from '../../../codec';
import { composeInputLocks, composeOutputLocks } from '../../../helpers';
import { correctCellMinimalCapacity, setAbsoluteCapacityMargin } from '../../../helpers';
import { getSporeConfig, getSporeScript, isSporeScriptSupported, SporeConfig } from '../../../config';
import { injectLiveClusterReference } from '../cluster/injectLiveClusterReference';
import { injectNewClusterProxyIds } from './injectNewClusterProxyIds';

export async function injectNewClusterProxyOutput(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  clusterCell: Cell;
  minPayment?: BIish;
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
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  hasId: boolean;
  reference: {
    referenceType: 'cell' | 'lockProxy';
    cluster?: {
      inputIndex: number;
      outputIndex: number;
    };
  };
}> {
  // Env
  const config = props.config ?? getSporeConfig();

  // TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Get Referenced cluster cell
  const referencedClusterCell = props.clusterCell;
  const referencedClusterType = referencedClusterCell.cellOutput.type;
  if (!referencedClusterType || !isSporeScriptSupported(config, referencedClusterType, 'Cluster')) {
    throw new Error('Cannot reference Cluster because target cell is not a supported version of Cluster');
  }

  // Inject referenced cluster or its LockProxy
  const injectLiveClusterReferenceResult = await injectLiveClusterReference({
    txSkeleton,
    cell: referencedClusterCell,
    inputLocks: composeInputLocks({
      fromInfos: props.fromInfos,
      config: config.lumos,
    }),
    outputLocks: composeOutputLocks({
      outputLocks: [props.toLock],
      fromInfos: props.fromInfos,
      changeAddress: props.changeAddress,
      config: config.lumos,
    }),
    updateOutput: props.cluster?.updateOutput,
    updateWitness: props.cluster?.updateWitness,
    capacityMargin: props.cluster?.capacityMargin,
    config,
  });
  txSkeleton = injectLiveClusterReferenceResult.txSkeleton;

  // Create ClusterProxy cell (the latest version)
  const clusterProxyScript = getSporeScript(config, 'ClusterProxy');
  let clusterProxyCell: Cell = correctCellMinimalCapacity({
    cellOutput: {
      capacity: '0x0',
      lock: props.toLock,
      type: {
        ...clusterProxyScript.script,
        args: bytes.hexify(
          packRawClusterProxyArgs({
            id: '0x' + '0'.repeat(64), // Fill 32-byte TypeId placeholder
            minPayment: props.minPayment,
          }),
        ),
      },
    },
    data: referencedClusterType.args,
  });

  // Add to Transaction.outputs
  const outputIndex = txSkeleton.get('outputs').size;
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    if (props.capacityMargin !== void 0) {
      clusterProxyCell = setAbsoluteCapacityMargin(clusterProxyCell, props.capacityMargin);
    }
    if (props.updateOutput instanceof Function) {
      clusterProxyCell = props.updateOutput(clusterProxyCell);
    }
    return outputs.push(clusterProxyCell);
  });

  // Fix the index of the ClusterProxy in outputs to prevent it from future reduction
  txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
    return fixedEntries.push({
      field: 'outputs',
      index: outputIndex,
    });
  });

  // Generate ID for the new ClusterProxy if possible
  const firstInput = txSkeleton.get('inputs').first();
  if (firstInput) {
    txSkeleton = injectNewClusterProxyIds({
      outputIndices: [outputIndex],
      txSkeleton,
      config,
    });
  }

  // Add ClusterProxy required dependencies
  txSkeleton = addCellDep(txSkeleton, clusterProxyScript.cellDep);

  return {
    txSkeleton,
    outputIndex,
    hasId: firstInput !== void 0,
    reference: {
      referenceType: injectLiveClusterReferenceResult.referenceType,
      cluster: injectLiveClusterReferenceResult.cluster,
    },
  };
}
