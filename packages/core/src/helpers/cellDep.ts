import { Script } from '@ckb-lumos/base';
import { helpers, RPC } from '@ckb-lumos/lumos';
import { getSporeConfig, SporeConfig } from '../config';
import { getCellWithStatusByOutPoint } from './cell';
import { isScriptValueEquals } from './script';

export async function findCellDepIndexByTypeFromTransactionSkeleton(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  type: Script;
  config?: SporeConfig;
}) {
  const config = props.config ?? getSporeConfig();

  const rpc = new RPC(config.ckbNodeUrl);
  const cellDeps = props.txSkeleton.get('cellDeps');

  for await (const [index, cellDep] of cellDeps.toArray().entries()) {
    const target = await getCellWithStatusByOutPoint({
      outPoint: cellDep.outPoint,
      rpc,
    });

    if (target.cell?.cellOutput.type && isScriptValueEquals(target.cell.cellOutput.type, props.type)) {
      return index;
    }
  }

  return -1;
}
