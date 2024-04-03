import { meltClusterAgent } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE } = accounts;

  const { txSkeleton } = await meltClusterAgent({
    outPoint: {
      txHash: '0x<transaction_hash>',
      index: '0x<cluster_agent_output_index>',
    },
    changeAddress: CHARLIE.address,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('MeltClusterAgent transaction sent, hash:', hash);
})();
