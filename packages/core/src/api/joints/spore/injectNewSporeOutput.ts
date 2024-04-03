import { BIish } from '@ckb-lumos/bi';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { bytes, BytesLike } from '@ckb-lumos/codec';
import { Address, PackedSince, Script } from '@ckb-lumos/base';
import { BI, Cell, helpers, Hash, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { packRawSporeData } from '../../../codec';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { EncodableContentType, setContentTypeParameters } from '../../../helpers';
import { correctCellMinimalCapacity, setAbsoluteCapacityMargin } from '../../../helpers';
import { composeInputLocks, composeOutputLocks, decodeContentType, isContentTypeValid } from '../../../helpers';
import { getClusterById } from '../cluster/getCluster';
import { injectLiveClusterReference } from '../cluster/injectLiveClusterReference';
import { injectLiveClusterAgentReference } from '../clusterAgent/injectLiveClusterAgentReference';
import { injectLiveMutantReferences } from '../mutant/injectLiveMutantReferences';
import { injectNewSporeIds } from './injectNewSporeIds';

export interface SporeDataProps {
  contentType: string;
  contentTypeParameters?: EncodableContentType['parameters'];
  content: BytesLike;
  clusterId?: Hash;
}

export async function injectNewSporeOutput(props: {
  txSkeleton: helpers.TransactionSkeletonType;
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
    defaultWitness?: HexString;
    since?: PackedSince;
  };
  clusterAgentCell?: Cell;
  clusterAgent?: {
    updateOutput?: (cell: Cell) => Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
    defaultWitness?: HexString;
    since?: PackedSince;
  };
  mutant?: {
    paymentAmount?: (minPayment: BI, lock: Script, cell: Cell) => BIish;
  };
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  hasId: boolean;
  reference: {
    referenceTarget: 'cluster' | 'clusterAgent' | 'none';
    referenceType?: 'cell' | 'lockProxy';
    cluster?: {
      inputIndex: number;
      outputIndex: number;
    };
    clusterAgent?: {
      inputIndex: number;
      outputIndex: number;
    };
  };
  mutantReference?: {
    referenceType: 'payment' | 'none';
    payment?: {
      outputIndices: number[];
    };
  };
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const sporeData = props.data;

  // TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Check should reference Cluster/ClusterAgent to the transaction
  const referencingCluster = !!sporeData.clusterId && !props.clusterAgentCell;
  const referencingClusterAgent = !!sporeData.clusterId && !!props.clusterAgentCell;

  // If referencing a Cluster, inject the Cluster or its LockProxy as reference
  let injectLiveClusterReferenceResult: Awaited<ReturnType<typeof injectLiveClusterReference>> | undefined;
  const clusterCell = sporeData.clusterId ? await getClusterById(sporeData.clusterId!, config) : void 0;
  if (referencingCluster) {
    injectLiveClusterReferenceResult = await injectLiveClusterReference({
      txSkeleton,
      cell: clusterCell!,
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
      capacityMargin: props.cluster?.capacityMargin,
      updateOutput: props.cluster?.updateOutput,
      updateWitness: props.cluster?.updateWitness,
      defaultWitness: props.cluster?.defaultWitness,
      since: props.cluster?.since,
      config,
    });
    txSkeleton = injectLiveClusterReferenceResult.txSkeleton;
  }

  // If ClusterAgent is provided, inject the ClusterAgent or its LockProxy as reference
  let injectLiveClusterAgentReferenceResult: Awaited<ReturnType<typeof injectLiveClusterAgentReference>> | undefined;
  if (referencingClusterAgent) {
    injectLiveClusterAgentReferenceResult = await injectLiveClusterAgentReference({
      txSkeleton,
      cell: props.clusterAgentCell!,
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
      capacityMargin: props.clusterAgent?.capacityMargin,
      updateOutput: props.clusterAgent?.updateOutput,
      updateWitness: props.clusterAgent?.updateWitness,
      defaultWitness: props.clusterAgent?.defaultWitness,
      since: props.clusterAgent?.since,
      config,
    });
    txSkeleton = injectLiveClusterAgentReferenceResult.txSkeleton;

    // Even if not referencing Cluster, still make sure Cluster related cellDeps are added
    const clusterType = clusterCell!.cellOutput.type;
    const clusterScript = getSporeScript(config, 'Cluster', clusterType!);
    if (!clusterType || !clusterScript) {
      throw new Error('Cannot reference Cluster because target cell is not a supported version of Cluster');
    }
    txSkeleton = addCellDep(txSkeleton, clusterScript.cellDep);
    txSkeleton = addCellDep(txSkeleton, {
      outPoint: clusterCell!.outPoint!,
      depType: 'code',
    });
  }

  // Validate SporeData.contentType
  const contentType = setContentTypeParameters(sporeData.contentType, sporeData.contentTypeParameters ?? {});
  if (!isContentTypeValid(contentType)) {
    throw new Error(`Spore has specified an invalid data.contentType: ${contentType}`);
  }

  // Create Spore cell (the latest version)
  const sporeScript = getSporeScript(config, 'Spore');
  let sporeCell: Cell = correctCellMinimalCapacity({
    cellOutput: {
      capacity: '0x0',
      lock: props.toLock,
      type: {
        ...sporeScript.script,
        args: '0x' + '0'.repeat(64), // Fill 32-byte TypeId placeholder
      },
    },
    data: bytes.hexify(
      packRawSporeData({
        contentType,
        content: sporeData.content,
        clusterId: sporeData.clusterId,
      }),
    ),
  });

  // Add to Transaction.outputs
  const outputIndex = txSkeleton.get('outputs').size;
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    if (props.capacityMargin !== void 0) {
      sporeCell = setAbsoluteCapacityMargin(sporeCell, props.capacityMargin);
    }
    if (props.updateOutput instanceof Function) {
      sporeCell = props.updateOutput(sporeCell);
    }
    return outputs.push(sporeCell);
  });

  // Fix the cell's output index to prevent it from future reduction
  txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
    return fixedEntries.push({
      field: 'outputs',
      index: outputIndex,
    });
  });

  // Generate ID for the new Spore if possible
  const firstInput = txSkeleton.get('inputs').first();
  if (firstInput !== void 0) {
    txSkeleton = injectNewSporeIds({
      outputIndices: [outputIndex],
      txSkeleton,
      config,
    });
  }

  // Inject Mutants as cellDeps, and inject payments if needed
  let injectLiveMutantReferencesResult: Awaited<ReturnType<typeof injectLiveMutantReferences>> | undefined;
  const decodedContentType = decodeContentType(contentType);
  if (decodedContentType.parameters.mutant !== void 0) {
    injectLiveMutantReferencesResult = await injectLiveMutantReferences({
      txSkeleton,
      mutantIds: decodedContentType.parameters.mutant,
      paymentAmount: props.mutant?.paymentAmount,
      config,
    });
    txSkeleton = injectLiveMutantReferencesResult.txSkeleton;
  }

  // Add Spore relevant cellDeps
  txSkeleton = addCellDep(txSkeleton, sporeScript.cellDep);

  return {
    txSkeleton,
    outputIndex,
    hasId: firstInput !== void 0,
    reference: {
      referenceTarget: referencingCluster ? 'cluster' : referencingClusterAgent ? 'clusterAgent' : 'none',
      referenceType: referencingCluster
        ? injectLiveClusterReferenceResult!.referenceType
        : referencingClusterAgent
          ? injectLiveClusterAgentReferenceResult!.referenceType
          : void 0,
      cluster: injectLiveClusterReferenceResult?.cluster,
      clusterAgent: injectLiveClusterAgentReferenceResult?.clusterAgent,
    },
    mutantReference: injectLiveMutantReferencesResult
      ? {
          referenceType: injectLiveMutantReferencesResult.referenceType,
          payment: injectLiveMutantReferencesResult.payment,
        }
      : void 0,
  };
}
