import { BIish } from '@ckb-lumos/bi';
import { BytesLike } from '@ckb-lumos/codec';
import { Address, Script } from '@ckb-lumos/base';
import { FromInfo } from '@ckb-lumos/common-scripts';
import { BI, Cell, helpers, Indexer } from '@ckb-lumos/lumos';
import { getSporeConfig, SporeConfig } from '../../../config';
import { assertTransactionSkeletonSize, injectCapacityAndPayFee } from '../../../helpers';
import { injectNewMutantOutput, injectNewMutantIds } from '../..';

export async function createMutant(props: {
  data: BytesLike;
  minPayment?: BIish;
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?(cell: Cell): Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  maxTransactionSize?: number | false;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  const capacityMargin = BI.from(props.capacityMargin ?? 1_0000_0000);
  const maxTransactionSize = props.maxTransactionSize ?? config.maxTransactionSize ?? false;

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Create and inject a new Mutant cell
  const injectNewMutantResult = injectNewMutantOutput({
    txSkeleton,
    data: props.data,
    toLock: props.toLock,
    minPayment: props.minPayment,
    updateOutput: props.updateOutput,
    capacityMargin,
    config,
  });
  txSkeleton = injectNewMutantResult.txSkeleton;

  // Inject needed capacity and pay fee
  const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
    txSkeleton,
    fromInfos: props.fromInfos,
    changeAddress: props.changeAddress,
    config,
  });
  txSkeleton = injectCapacityAndPayFeeResult.txSkeleton;

  // Generate and inject ID for the new Mutant
  txSkeleton = injectNewMutantIds({
    outputIndices: [injectNewMutantResult.outputIndex],
    txSkeleton,
    config,
  });

  // Make sure the tx size is in range (if needed)
  if (typeof maxTransactionSize === 'number') {
    assertTransactionSkeletonSize(txSkeleton, void 0, maxTransactionSize);
  }

  return {
    txSkeleton,
    outputIndex: injectNewMutantResult.outputIndex,
  };
}
