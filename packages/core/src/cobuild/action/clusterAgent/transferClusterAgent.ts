import { helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';

export function generateTransferClusterAgentAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  let txSkeleton = props.txSkeleton;
  const clusterAgentInput = txSkeleton.get('inputs').get(props.inputIndex);
  const clusterAgentOutput = txSkeleton.get('outputs').get(props.outputIndex);

  const clusterAgentType = clusterAgentOutput!.cellOutput.type!;
  const clusterAgentTypeHash = utils.computeScriptHash(clusterAgentType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: clusterAgentTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'TransferClusterAgent',
    value: {
      clusterId: clusterAgentType.args.slice(0, 66),
      from: {
        type: 'Script',
        value: clusterAgentInput!.cellOutput.lock,
      },
      to: {
        type: 'Script',
        value: clusterAgentOutput!.cellOutput.lock,
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

export function generateTransferClusterAgentBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
  useCapacityMarginAsFee: boolean;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateTransferClusterAgentAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: props.useCapacityMarginAsFee ? props.outputIndex : txSkeleton.get('outputs').size - 1,
  });
}
