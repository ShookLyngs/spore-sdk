import { BI, helpers, Indexer } from '@ckb-lumos/lumos';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { Address, OutPoint } from '@ckb-lumos/base';
import { SporeConfig } from '../../../config';
import { injectCapacityAndPayFee } from '../../../helpers';
import { getSporeCellByOutPoint, injectLiveSporeCell } from '../../joints/spore';

export async function destroySpore(props: {
  sporeOutPoint: OutPoint;
  fromInfos: FromInfo[];
  config: SporeConfig;
  changeAddress?: Address;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}> {
  // Env
  const config = props.config;
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);

  // Get TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Inject live spore to Transaction.inputs
  const sporeCell = await getSporeCellByOutPoint(props.sporeOutPoint, config);
  const injectLiveSporeCellResult = await injectLiveSporeCell({
    sporeCell,
    txSkeleton,
    config,
  });
  txSkeleton = injectLiveSporeCellResult.txSkeleton;

  // Inject needed capacity and pay fee
  const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
    txSkeleton,
    changeAddress: props.changeAddress,
    fromInfos: props.fromInfos,
    fee: BI.from(0),
    config,
  });
  txSkeleton = injectCapacityAndPayFeeResult.txSkeleton;

  return {
    txSkeleton,
    inputIndex: injectLiveSporeCellResult.inputIndex,
  };
}
