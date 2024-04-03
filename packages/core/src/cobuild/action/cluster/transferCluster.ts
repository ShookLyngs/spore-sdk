import { Cell, helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';

export function assembleTransferClusterAction(
  clusterInput: Cell | undefined,
  clusterOutput: Cell | undefined,
): {
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
    type: 'TransferCluster',
    value: {
      clusterId: clusterType.args,
      from: {
        type: 'Script',
        value: clusterInput!.cellOutput.lock,
      },
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

export function generateTransferClusterAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  let txSkeleton = props.txSkeleton;
  const clusterInput = txSkeleton.get('inputs').get(props.inputIndex);
  const clusterOutput = txSkeleton.get('outputs').get(props.outputIndex);
  return assembleTransferClusterAction(clusterInput, clusterOutput);
}

export function generateTransferClusterBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
  useCapacityMarginAsFee: boolean;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateTransferClusterAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: props.useCapacityMarginAsFee ? props.outputIndex : txSkeleton.get('outputs').size - 1,
  });
}
