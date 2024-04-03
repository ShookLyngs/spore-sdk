import { transferClusterAgent } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE, ALICE } = accounts;

  const { txSkeleton, outputIndex } = await transferClusterAgent({
    outPoint: {
      txHash: '0x<transaction_hash>',
      index: '<cluster_agent_output_index>',
    },
    fromInfos: [CHARLIE.address],
    toLock: ALICE.lock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('TransferClusterAgent transaction sent, hash:', hash);
  console.log('ClusterAgent output index:', outputIndex);
})();
