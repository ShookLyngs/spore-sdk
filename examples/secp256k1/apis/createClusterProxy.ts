import { createClusterProxy, getClusterById, unpackToRawClusterProxyArgs } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE } = accounts;

  /**
   * The target Cluster's ID you want to create ClusterProxy from.
   *
   * Ensure that any of the following conditions can be fulfilled:
   * - You can provide a signature to unlock the Cluster
   * - You can provide and unlock any LockProxy of the Cluster
   *
   * Example Cluster "0x928e...8b27":
   * - Cluster ID: 0x928eb52ffeb8864154b2135d57ac57b70d97ba908c5a7205ed5e5dc022468b27
   * - Ownership: CHARLIE
   */
  const clusterCell = await getClusterById('0x928eb52ffeb8864154b2135d57ac57b70d97ba908c5a7205ed5e5dc022468b27', config);

  const { txSkeleton, outputIndex } = await createClusterProxy({
    clusterOutPoint: clusterCell.outPoint!,
    fromInfos: [CHARLIE.address],
    toLock: CHARLIE.lock,
    /**
     * Anyone who pays a minimum 10^minPayment shannons to toLock can use the ClusterProxy.
     * If undefined, the "pay to use" method will be disabled for others.
     */
    minPayment: 10,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('CreateClusterProxy transaction sent, hash:', hash);
  console.log('ClusterProxy output index:', outputIndex);

  const clusterProxyCell = txSkeleton.get('outputs').get(outputIndex)!;
  const clusterProxyArgs = unpackToRawClusterProxyArgs(clusterProxyCell.cellOutput.type!.args);
  console.log('ClusterProxy ID:', clusterProxyArgs.id);
})();
