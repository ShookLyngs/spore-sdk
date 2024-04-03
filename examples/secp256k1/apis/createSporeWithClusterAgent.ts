import { bytifyRawString, createSpore } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';
import { OutPoint } from '@ckb-lumos/base';

(async function main() {
  const { ALICE } = accounts;

  /**
   * The Cluster's ID you want to reference to the new Spore.
   *
   * The example Cluster "0x928e...8b27":
   * - Cluster ID: 0x928eb52ffeb8864154b2135d57ac57b70d97ba908c5a7205ed5e5dc022468b27
   * - Ownership: CHARLIE
   */
  const clusterId = '0x928eb52ffeb8864154b2135d57ac57b70d97ba908c5a7205ed5e5dc022468b27';

  /**
   * The ClusterAgent you want to reference in the transaction.
   *
   * Example ClusterAgent "0xfca6...ae6b|0x1":
   * - Referenced Cluster: "0x928e...8b27"
   * - Ownership: ALICE
   *
   * ClusterAgent "0xfca6...ae6b|0x1" is owned by ALICE and is referenced to Cluster "0x928e...8b27".
   * It allows ALICE to reference the Cluster's ID in Spores.
   */
  const clusterAgentOutPoint: OutPoint = {
    txHash: '0xfca6e903083893b143863bf3256d40fee408dae11ae359a4637d46a815f7ae6b',
    index: '0x1',
  };

  const { txSkeleton, outputIndex } = await createSpore({
    data: {
      clusterId,
      contentType: 'text/plain',
      content: bytifyRawString('spore text content'),
    },
    /**
     * When clusterAgentOutpoint is specified, will reference the ClusterAgent (Cell or LockProxy) in the transaction,
     * instead of referencing the Cluster (Cell or LockProxy) directly.
     */
    clusterAgentOutPoint,
    fromInfos: [ALICE.address],
    toLock: ALICE.lock,
    config,
  });

  const hash = await ALICE.signAndSendTransaction(txSkeleton);
  console.log('CreateSporeWithClusterAgent transaction sent, hash:', hash);
  console.log('Spore output index:', outputIndex);
})();
