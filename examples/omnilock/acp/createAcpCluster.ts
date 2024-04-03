import { createCluster } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';
import { createOmnilockAcpArgs } from '../utils/wallet';

(async function main() {
  const { CHARLIE } = accounts;

  /**
   * Create an Omnilock from CHARLIE's original lock, adding minimal payment requirement to the Cluster.
   * Anyone who references the lock cell without providing a signature to unlock it,
   * will have to pay at least 10^minCkb shannons to the lock cell as a fee.
   *
   * Examples:
   * If minCkb = 10, anyone can pay 10,000,000,000 (10^10) shannons to the Cluster as a fee of referencing it.
   * If minCkb = 0, anyone can pay 1 (10^0) shannon to the Cluster as a fee of referencing it.
   */
  const CharlieOmniAcpLock = CHARLIE.createLock(
    createOmnilockAcpArgs({
      minCkb: 0,
    })
  );

  const { txSkeleton, outputIndex } = await createCluster({
    data: {
      name: 'Test omnilock acp cluster',
      description: 'An public cluster with omnilock',
    },
    fromInfos: [CHARLIE.address],
    toLock: CharlieOmniAcpLock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('CreateAcpCluster transaction sent, hash:', hash);
  console.log('Cluster output index:', outputIndex);

  const clusterCell = txSkeleton.get('outputs').get(outputIndex)!;
  console.log('Cluster ID:', clusterCell.cellOutput.type!.args);
})();
