import { BIish } from '@ckb-lumos/bi';
import { Address, Script } from '@ckb-lumos/base';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { BI, Cell, helpers, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { packRawClusterAgentDataToHash } from '../../../codec';
import { correctCellMinimalCapacity, setAbsoluteCapacityMargin } from '../../../helpers';
import { getSporeConfig, getSporeScript, isSporeScriptSupported, SporeConfig } from '../../../config';
import { injectLiveClusterProxyReference } from '../clusterProxy/injectLiveClusterProxyReference';

export async function injectNewClusterAgentOutput(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  clusterProxyCell: Cell;
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
  reference: {
    referenceType: 'cell' | 'payment';
    clusterProxy?: {
      inputIndex: number;
      outputIndex: number;
    };
    payment?: {
      outputIndex: number;
    };
  };
}> {
  // Env
  const config = props.config ?? getSporeConfig();

  // TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Get the referenced ClusterProxy
  const clusterProxyCell = props.clusterProxyCell;
  const clusterProxyType = clusterProxyCell.cellOutput.type;
  if (!clusterProxyType || !isSporeScriptSupported(config, clusterProxyType, 'ClusterProxy')) {
    throw new Error('Cannot reference ClusterProxy because target cell is not a supported version of ClusterProxy');
  }

  // Reference the ClusterProxy directly or through a payment cell
  const injectLiveClusterProxyReferenceResult = await injectLiveClusterProxyReference({
    txSkeleton,
    cell: clusterProxyCell,
    referenceType: props.referenceType,
    paymentAmount: props.paymentAmount,
    capacityMargin: props.clusterProxy?.capacityMargin,
    updateWitness: props.clusterProxy?.updateWitness,
    updateOutput: props.clusterProxy?.updateOutput,
    config,
  });
  txSkeleton = injectLiveClusterProxyReferenceResult.txSkeleton;

  // Create ClusterAgent cell (the latest version)
  const clusterAgentScript = getSporeScript(config, 'ClusterAgent');
  const referencedClusterId = clusterProxyCell.data;
  let clusterAgentCell: Cell = correctCellMinimalCapacity({
    cellOutput: {
      capacity: '0x0',
      lock: props.toLock,
      type: {
        ...clusterAgentScript.script,
        args: referencedClusterId,
      },
    },
    data: packRawClusterAgentDataToHash(clusterProxyType),
  });

  // Add to Transaction.outputs
  const outputIndex = txSkeleton.get('outputs').size;
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    if (props.capacityMargin !== void 0) {
      clusterAgentCell = setAbsoluteCapacityMargin(clusterAgentCell, props.capacityMargin);
    }
    if (props.updateOutput instanceof Function) {
      clusterAgentCell = props.updateOutput(clusterAgentCell);
    }
    return outputs.push(clusterAgentCell);
  });

  // Fix the index of the ClusterAgent in outputs to prevent it from future reduction
  txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
    return fixedEntries.push({
      field: 'outputs',
      index: outputIndex,
    });
  });

  // Add ClusterAgent required cellDeps
  txSkeleton = addCellDep(txSkeleton, clusterAgentScript.cellDep);

  return {
    txSkeleton,
    outputIndex,
    reference: {
      referenceType: injectLiveClusterProxyReferenceResult.referenceType,
      clusterProxy: injectLiveClusterProxyReferenceResult.clusterProxy,
      payment: injectLiveClusterProxyReferenceResult.payment,
    },
  };
}
