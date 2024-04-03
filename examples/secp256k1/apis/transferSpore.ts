import { getSporeById, transferSpore } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE, ALICE } = accounts;

  const sporeCell = await getSporeById('0x<spore_id>', config);

  const { txSkeleton, outputIndex } = await transferSpore({
    outPoint: sporeCell.outPoint!,
    fromInfos: [CHARLIE.address],
    toLock: ALICE.lock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('TransferSpore transaction sent, hash:', hash);
  console.log('Spore output index:', outputIndex);
})();
