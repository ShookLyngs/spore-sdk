import { Cell, helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';

export function assembleCreateClusterAction(clusterOutput: Cell | undefined): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  const clusterType = clusterOutput!.cellOutput.type!;
  const clusterTypeHash = utils.computeScriptHash(clusterType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: clusterTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'CreateCluster',
    value: {
      clusterId: clusterType.args,
      dataHash: utils.ckbHash(clusterOutput!.data),
      to: {
        type: 'Script',
        value: clusterOutput!.cellOutput.lock,
      },
    },
  });
  actions.push({
    scriptInfoHash: utils.ckbHash(ScriptInfo.pack(scriptInfo)),
    scriptHash: clusterTypeHash,
    data: bytes.hexify(actionData),
  });

  return {
    actions,
    scriptInfos,
  };
}

export function generateCreateClusterAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  let txSkeleton = props.txSkeleton;
  const clusterOutput = txSkeleton.get('outputs').get(props.outputIndex);
  return assembleCreateClusterAction(clusterOutput);
}

export function generateCreateClusterBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateCreateClusterAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: txSkeleton.get('outputs').size - 1,
  });
}
