import { helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';
import { unpackToRawClusterProxyArgs } from '../../../codec';

export function generateTransferClusterProxyAction(props: {
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
  const clusterProxyInput = txSkeleton.get('inputs').get(props.inputIndex);
  const clusterProxyOutput = txSkeleton.get('outputs').get(props.outputIndex);

  const clusterProxyType = clusterProxyOutput!.cellOutput.type!;
  const clusterProxyTypeHash = utils.computeScriptHash(clusterProxyType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: clusterProxyTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'TransferClusterProxy',
    value: {
      clusterId: clusterProxyOutput!.data,
      clusterProxyId: unpackToRawClusterProxyArgs(clusterProxyType.args).id,
      from: {
        type: 'Script',
        value: clusterProxyInput!.cellOutput.lock,
      },
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

  return {
    actions,
    scriptInfos,
  };
}

export function generateTransferClusterProxyBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
  useCapacityMarginAsFee: boolean;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateTransferClusterProxyAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: props.useCapacityMarginAsFee ? props.outputIndex : txSkeleton.get('outputs').size - 1,
  });
}
