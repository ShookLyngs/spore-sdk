import { helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { injectNewClusterProxyOutput } from '../../../api';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';
import { generateReferenceClusterAction } from '../cluster/referenceCluster';
import { unpackToRawClusterProxyArgs } from '../../../codec';

export function generateCreateClusterProxyAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewClusterProxyOutput>>['reference'];
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  let txSkeleton = props.txSkeleton;
  const clusterProxyOutput = txSkeleton.get('outputs').get(props.outputIndex);

  const clusterProxyType = clusterProxyOutput!.cellOutput.type!;
  const clusterProxyTypeHash = utils.computeScriptHash(clusterProxyType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: clusterProxyTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'CreateClusterProxy',
    value: {
      clusterId: clusterProxyOutput!.data,
      clusterProxyId: unpackToRawClusterProxyArgs(clusterProxyType.args).id,
      to: {
        type: 'Script',
        value: clusterProxyOutput!.cellOutput.lock,
      },
    },
  });
  actions.push({
    scriptInfoHash: utils.ckbHash(ScriptInfo.pack(scriptInfo)),
    scriptHash: clusterProxyTypeHash,
    data: bytes.hexify(actionData),
  });

  const clusterAction = generateReferenceClusterAction({
    txSkeleton,
    referenceType: props.reference.referenceType,
    cluster: props.reference.cluster,
  });
  actions.push(...clusterAction.actions);
  scriptInfos.push(...clusterAction.scriptInfos);

  return {
    actions,
    scriptInfos,
  };
}

export function generateCreateClusterProxyBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewClusterProxyOutput>>['reference'];
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateCreateClusterProxyAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: txSkeleton.get('outputs').size - 1,
  });
}
