import { Cell, helpers, utils } from '@ckb-lumos/lumos';
import { bytes, UnpackResult } from '@ckb-lumos/codec';
import { injectNewSporeOutput } from '../../../api';
import { SporeAction } from '../../codec/sporeAction';
import { Action, ScriptInfo } from '../../codec/buildingPacket';
import { createRawBuildingPacket } from '../../base/buildingPacket';
import { createSporeScriptInfoFromTemplate } from '../../base/sporeScriptInfo';
import { generateReferenceClusterAction } from '../cluster/referenceCluster';
import { generateReferenceClusterAgentAction } from '../clusterAgent/referenceClusterAgent';

export function assembleCreateSporeAction(sporeOutput: Cell | undefined): {
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
    type: 'CreateSpore',
    value: {
      sporeId: sporeType.args,
      dataHash: utils.ckbHash(sporeOutput!.data),
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

export function generateCreateSporeAction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewSporeOutput>>['reference'];
}): {
  actions: UnpackResult<typeof Action>[];
  scriptInfos: UnpackResult<typeof ScriptInfo>[];
} {
  let txSkeleton = props.txSkeleton;
  const sporeOutput = txSkeleton.get('outputs').get(props.outputIndex);
  let { actions, scriptInfos } = assembleCreateSporeAction(sporeOutput);

  if (props.reference.referenceTarget === 'clusterAgent') {
    const clusterAction = generateReferenceClusterAgentAction({
      txSkeleton,
      referenceType: props.reference.referenceType!,
      clusterAgent: props.reference.clusterAgent,
    });

    actions.push(...clusterAction.actions);
    scriptInfos.push(...clusterAction.scriptInfos);
  }
  if (props.reference.referenceTarget === 'cluster') {
    const clusterAction = generateReferenceClusterAction({
      txSkeleton,
      referenceType: props.reference.referenceType!,
      cluster: props.reference.cluster,
    });

    actions.push(...clusterAction.actions);
    scriptInfos.push(...clusterAction.scriptInfos);
  }

  return {
    actions,
    scriptInfos,
  };
}

export function generateCreateSporeBuildingPacket(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewSporeOutput>>['reference'];
}) {
  let txSkeleton = props.txSkeleton;

  const action = generateCreateSporeAction(props);
  return createRawBuildingPacket({
    txSkeleton,
    actions: action.actions,
    scriptInfos: action.scriptInfos,
    changeOutput: txSkeleton.get('outputs').size - 1,
  });
}
