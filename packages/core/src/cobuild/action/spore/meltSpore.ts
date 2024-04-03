import { Cell, helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';

export function assembleMeltSporeAction(sporeInput: Cell | undefined): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  const actions: UnpackResult<typeof Action>[] = [];
  const scriptInfos: UnpackResult<typeof ScriptInfo>[] = [];

  const sporeType = sporeInput!.cellOutput.type!;
  const sporeTypeHash = utils.computeScriptHash(sporeType);
  const scriptInfo = createSporeScriptInfoFromTemplate({
    scriptHash: sporeTypeHash,
  });
  scriptInfos.push(scriptInfo);

  const actionData = SporeAction.pack({
    type: 'MeltSpore',
    value: {
      sporeId: sporeType.args,
      from: {
        type: 'Script',
        value: sporeInput!.cellOutput.lock,
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

export function generateMeltSporeAction(props: { txSkeleton: helpers.TransactionSkeletonType; inputIndex: number }): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  let txSkeleton = props.txSkeleton;
  const sporeInput = txSkeleton.get('inputs').get(props.inputIndex);
  return assembleMeltSporeAction(sporeInput);
}

export function generateMeltSporeBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateMeltSporeAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: txSkeleton.get('outputs').size - 1,
  });
}
