import { Cell, helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';

export function assembleTransferSporeAction(
  sporeInput: Cell | undefined,
  sporeOutput: Cell | undefined,
): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  const sporeType = sporeOutput!.cellOutput.type!;
  const sporeTypeHash = utils.computeScriptHash(sporeType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: sporeTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'TransferSpore',
    value: {
      sporeId: sporeType.args,
      from: {
        type: 'Script',
        value: sporeInput!.cellOutput.lock,
      },
      to: {
        type: 'Script',
        value: sporeOutput!.cellOutput.lock,
      },
    },
  });
  actions.push({
    scriptInfoHash: utils.ckbHash(ScriptInfo.pack(scriptInfo)),
    scriptHash: sporeTypeHash,
    data: bytes.hexify(actionData),
  });

  return {
    actions,
    scriptInfos,
  };
}

export function generateTransferSporeAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  let txSkeleton = props.txSkeleton;
  const sporeInput = txSkeleton.get('inputs').get(props.inputIndex);
  const sporeOutput = txSkeleton.get('outputs').get(props.outputIndex);
  return assembleTransferSporeAction(sporeInput, sporeOutput);
}

export function generateTransferSporeBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
  useCapacityMarginAsFee: boolean;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateTransferSporeAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: props.useCapacityMarginAsFee ? props.outputIndex : txSkeleton.get('outputs').size - 1,
  });
}
