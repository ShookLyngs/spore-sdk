import { createCluster } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE } = accounts;

  /**
   * Create an Anyone-can-pay lock from CHARLIE's CKB default lock, adding minimal payment requirement to the Cluster.
   * Anyone who references the lock cell without providing a signature to unlock it, will need to following:
   * - If minCkb is defined, pay at least 10^minCkb shannons to the lock cell as a fee.
   * - If minCkb is undefined, anyone can reference this Cluster without payment.
   *
   * Examples:
   * If minCkb = 10, anyone can pay 10,000,000,000 (10^10) shannons to the Cluster as a fee of referencing it.
   * If minCkb = 0, anyone can pay 1 (10^0) shannon to the Cluster as a fee of referencing it.
   * If minCkb = undefined, anyone can reference this Cluster without payment.
   */
  const CharlieAcpLock = CHARLIE.createAcpLock({
    minCkb: void 0,
  });

  const { txSkeleton, outputIndex } = await createCluster({
    data: {
      name: 'Test acp lock cluster',
      description: 'A public cluster with acp lock',
    },
    fromInfos: [CHARLIE.address],
    toLock: CharlieAcpLock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('CreateAcpCluster transaction sent, hash:', hash);
  console.log('Cluster output index:', outputIndex);

  const clusterCell = txSkeleton.get('outputs').get(outputIndex)!;
  console.log('Cluster ID:', clusterCell.cellOutput.type!.args);
})();
