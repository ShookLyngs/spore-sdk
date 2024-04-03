import { bytifyRawString, createSpore } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE } = accounts;

  /**
   * The Cluster's ID you want to reference to the new Spore.
   *
   * Ensure that any of the following conditions can be fulfilled:
   * - You can provide a signature to unlock the Cluster
   * - You can provide and unlock any LockProxy of the Cluster
   *
   * The example Cluster "0x928e...8b27":
   * - Cluster ID: 0x928eb52ffeb8864154b2135d57ac57b70d97ba908c5a7205ed5e5dc022468b27
   * - Ownership: CHARLIE
   */
  const clusterId = '0x928eb52ffeb8864154b2135d57ac57b70d97ba908c5a7205ed5e5dc022468b27';

  const { txSkeleton, outputIndex } = await createSpore({
    data: {
      /**
       * When data.clusterId is specified, will reference the Cluster (Cell or LockProxy) in the transaction.
       * The Spore will be a Clustered Spore, referenced to the Cluster.
       */
      clusterId,
      contentType: 'text/plain',
      content: bytifyRawString('spore text content'),
    },
    fromInfos: [CHARLIE.address],
    toLock: CHARLIE.lock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('CreateSporeWithCluster transaction sent, hash:', hash);
  console.log('Spore output index:', outputIndex);
})();
