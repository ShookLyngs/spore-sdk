import { helpers } from '@ckb-lumos/lumos';
import { UnpackResult } from '@ckb-lumos/codec';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { generateTransferClusterProxyAction } from './transferClusterProxy';

export function generateReferenceClusterProxyAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  referenceType: 'payment' | 'cell';
  clusterProxy?: {
    inputIndex: number;
    outputIndex: number;
  };
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  if (props.referenceType === 'payment') {
    return {
      actions: [],
      scriptInfos: [],
    };
  }
  if (!props.clusterProxy) {
    throw new Error('Cannot generate TransferClusterProxy Action without clusterProxy info');
  }

  return generateTransferClusterProxyAction({
    txSkeleton: props.txSkeleton,
    inputIndex: props.clusterProxy.inputIndex,
    outputIndex: props.clusterProxy.outputIndex,
  });
}
