import { Address, OutPoint, PackedSince } from '@ckb-lumos/base';
import { helpers, HexString, Indexer } from '@ckb-lumos/lumos';
import { returnExceededCapacityAndPayFee } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { getSporeByOutPoint, injectLiveSporeCell } from '../..';
import { generateMeltSporeAction, injectCommonCobuildProof } from '../../../cobuild';

export async function meltSpore(props: {
  outPoint: OutPoint;
  changeAddress?: Address;
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Inject live spore to Transaction.inputs
  const sporeCell = await getSporeByOutPoint(props.outPoint, config);
  const injectLiveSporeCellResult = await injectLiveSporeCell({
    txSkeleton,
    cell: sporeCell,
    updateWitness: props.updateWitness,
    defaultWitness: props.defaultWitness,
    since: props.since,
    config,
  });
  txSkeleton = injectLiveSporeCellResult.txSkeleton;

  // Inject CobuildProof
  const sporeScript = getSporeScript(config, 'Spore', sporeCell.cellOutput.type!);
  if (sporeScript.behaviors?.cobuild) {
    const actionResult = generateMeltSporeAction({
      txSkeleton: txSkeleton,
      inputIndex: injectLiveSporeCellResult.inputIndex,
    });
    const injectCobuildProofResult = injectCommonCobuildProof({
      txSkeleton: txSkeleton,
      actions: actionResult.actions,
    });
    txSkeleton = injectCobuildProofResult.txSkeleton;
  }

  // Redeem capacity from the melted spore
  const sporeAddress = helpers.encodeToAddress(sporeCell.cellOutput.lock, { config: config.lumos });
  const returnExceededCapacityAndPayFeeResult = await returnExceededCapacityAndPayFee({
    changeAddress: props.changeAddress ?? sporeAddress,
    txSkeleton,
    config,
  });
  txSkeleton = returnExceededCapacityAndPayFeeResult.txSkeleton;

  return {
    txSkeleton,
    inputIndex: injectLiveSporeCellResult.inputIndex,
  };
}
