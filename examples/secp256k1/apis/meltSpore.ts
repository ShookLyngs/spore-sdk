import { getSporeById, meltSpore } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE } = accounts;

  const sporeCell = await getSporeById('0x<spore_id>', config);

  const { txSkeleton } = await meltSpore({
    outPoint: sporeCell.outPoint!,
    changeAddress: CHARLIE.address,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('MeltSpore transaction sent, hash:', hash);
})();
