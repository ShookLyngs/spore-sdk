import { helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';
import { unpackToRawClusterProxyArgs } from '../../../codec';

export function generateMeltClusterProxyAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  let txSkeleton = props.txSkeleton;
  const clusterProxyInput = txSkeleton.get('inputs').get(props.inputIndex);

  const clusterProxyType = clusterProxyInput!.cellOutput.type!;
  const clusterProxyTypeHash = utils.computeScriptHash(clusterProxyType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: clusterProxyTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'MeltClusterProxy',
    value: {
      clusterId: clusterProxyInput!.data,
      clusterProxyId: unpackToRawClusterProxyArgs(clusterProxyType.args).id,
      from: {
        type: 'Script',
        value: clusterProxyInput!.cellOutput.lock,
      },
    },
  });
  actions.push({
    scriptInfoHash: utils.ckbHash(ScriptInfo.pack(scriptInfo)),
    scriptHash: clusterProxyTypeHash,
    data: bytes.hexify(actionData),
  });

  return {
    actions,
    scriptInfos,
  };
}

export function generateMeltClusterProxyBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateMeltClusterProxyAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: txSkeleton.get('outputs').size - 1,
  });
}
