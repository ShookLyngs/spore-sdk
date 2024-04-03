import { helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { injectNewClusterAgentOutput } from '../../../api';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';
import { generateReferenceClusterProxyAction } from '../clusterProxy/referenceClusterProxy';
import { Hash } from '@ckb-lumos/base';

export function generateCreateClusterAgentAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  clusterProxyId: Hash;
  reference: Awaited<ReturnType<typeof injectNewClusterAgentOutput>>['reference'];
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  let txSkeleton = props.txSkeleton;
  const clusterOutput = txSkeleton.get('outputs').get(props.outputIndex);

  const clusterAgentType = clusterOutput!.cellOutput.type!;
  const clusterAgentTypeHash = utils.computeScriptHash(clusterAgentType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: clusterAgentTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'CreateClusterAgent',
    value: {
      clusterId: clusterAgentType.args,
      clusterProxyId: props.clusterProxyId,
      to: {
        type: 'Script',
        value: clusterOutput!.cellOutput.lock,
      },
    },
  });
  actions.push({
    scriptInfoHash: utils.ckbHash(ScriptInfo.pack(scriptInfo)),
    scriptHash: clusterAgentTypeHash,
    data: bytes.hexify(actionData),
  });

  const clusterAction = generateReferenceClusterProxyAction({
    txSkeleton,
    referenceType: props.reference.referenceType,
    clusterProxy: props.reference.clusterProxy,
  });
  actions.push(...clusterAction.actions);
  scriptInfos.push(...clusterAction.scriptInfos);

  return {
    actions,
    scriptInfos,
  };
}

export function generateCreateClusterAgentBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  clusterProxyId: Hash;
  reference: Awaited<ReturnType<typeof injectNewClusterAgentOutput>>['reference'];
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateCreateClusterAgentAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: txSkeleton.get('outputs').size - 1,
  });
}
