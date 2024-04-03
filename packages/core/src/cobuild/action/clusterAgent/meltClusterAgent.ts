import { helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';

export function generateMeltClusterAgentAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  let txSkeleton = props.txSkeleton;
  const clusterAgentInput = txSkeleton.get('inputs').get(props.inputIndex);

  const clusterAgentType = clusterAgentInput!.cellOutput.type!;
  const clusterAgentTypeHash = utils.computeScriptHash(clusterAgentType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: clusterAgentTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'MeltClusterAgent',
    value: {
      clusterId: clusterAgentInput!.cellOutput.type!.args,
      from: {
        type: 'Script',
        value: clusterAgentInput!.cellOutput.lock,
      },
    },
  });
  actions.push({
    scriptInfoHash: utils.ckbHash(ScriptInfo.pack(scriptInfo)),
    scriptHash: clusterAgentTypeHash,
    data: bytes.hexify(actionData),
  });

  return {
    actions,
    scriptInfos,
  };
}

export function generateMeltClusterAgentBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateMeltClusterAgentAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: txSkeleton.get('outputs').size - 1,
  });
}
