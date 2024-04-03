import { helpers } from '@ckb-lumos/lumos';
import { UnpackResult } from '@ckb-lumos/codec';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { generateTransferClusterAgentAction } from './transferClusterAgent';

export function generateReferenceClusterAgentAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  referenceType: 'cell' | 'lockProxy';
  clusterAgent?: {
    inputIndex: number;
    outputIndex: number;
  };
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  if (props.referenceType === 'lockProxy') {
    return {
      actions: [],
      scriptInfos: [],
    };
  }
  if (!props.clusterAgent) {
    throw new Error('Cannot generate TransferClusterAgent Action without clusterAgent info');
  }

  return generateTransferClusterAgentAction({
    txSkeleton: props.txSkeleton,
    inputIndex: props.clusterAgent.inputIndex,
    outputIndex: props.clusterAgent.outputIndex,
  });
}
