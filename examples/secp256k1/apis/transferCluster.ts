import { getClusterById, transferCluster } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE, ALICE } = accounts;

  const clusterCell = await getClusterById('0x<cluster_id>', config);

  const { txSkeleton, outputIndex } = await transferCluster({
    outPoint: clusterCell.outPoint!,
    fromInfos: [CHARLIE.address],
    toLock: ALICE.lock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('TransferCluster transaction sent, hash:', hash);
  console.log('Cluster output index:', outputIndex);
})();
