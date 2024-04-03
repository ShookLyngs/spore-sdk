import { helpers } from '@ckb-lumos/lumos';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { generateTransferClusterAction } from './transferCluster';
import { UnpackResult } from '@ckb-lumos/codec';

export function generateReferenceClusterAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  referenceType: 'cell' | 'lockProxy';
  cluster?: {
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
  if (!props.cluster) {
    throw new Error('Cannot generate TransferCluster Action without cluster info');
  }

  return generateTransferClusterAction({
    txSkeleton: props.txSkeleton,
    inputIndex: props.cluster.inputIndex,
    outputIndex: props.cluster.outputIndex,
  });
}
