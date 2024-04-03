import { helpers } from '@ckb-lumos/lumos';
import { UnpackResult } from '@ckb-lumos/codec';
import { ActionVec, BuildingPacket, ScriptInfoVec } from '../codec/buildingPacket';
import { inputCellsToResolvedInputs } from './resolvedInputs';

export function createRawBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  scriptInfos?: UnpackResult<typeof ScriptInfoVec>;
  actions?: UnpackResult<typeof ActionVec>;
  changeOutput?: number;
}): UnpackResult<typeof BuildingPacket> {
  const txSkeleton = props.txSkeleton;
  return {
    type: 'BuildingPacketV1',
    value: {
      message: {
        actions: props.actions ?? [],
      },
      payload: helpers.createTransactionFromSkeleton(txSkeleton),
      resolvedInputs: inputCellsToResolvedInputs(txSkeleton.get('inputs')),
      changeOutput: props.changeOutput ?? txSkeleton.get('outputs').size - 1,
      scriptInfos: props.scriptInfos ?? [],
      lockActions: [],
    },
  };
}
