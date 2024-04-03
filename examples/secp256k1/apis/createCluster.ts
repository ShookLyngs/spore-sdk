import { createCluster } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE } = accounts;

  const { txSkeleton, outputIndex } = await createCluster({
    data: {
      name: 'Test cluster',
      description: 'Description of the cluster',
    },
    fromInfos: [CHARLIE.address],
    toLock: CHARLIE.lock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('CreateCluster transaction sent, hash:', hash);
  console.log('Cluster output index:', outputIndex);

  const clusterCell = txSkeleton.get('outputs').get(outputIndex)!;
  console.log('Cluster ID:', clusterCell.cellOutput.type!.args);
})();
