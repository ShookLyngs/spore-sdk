import { createClusterAgent, getClusterProxyById } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';
import { BI } from '@ckb-lumos/bi';

(async function main() {
  const { ALICE } = accounts;

  /**
   * The target ClusterProxy's ID you want to create ClusterAgent from.
   *
   * Ensure that any of the following conditions can be fulfilled:
   * - You can unlock the ClusterProxy, or you can provide and unlock any LockProxy of the ClusterProxy
   * - If the ClusterProxy has minPayment defined, and you can pay the owner of the ClusterProxy a fee
   *
   * Example ClusterProxy "0x484a...e857":
   * - ClusterProxy ID: 0x484a439338ebe0ef6f953ead4273a59fc5972d31e67e7e51e7a9c01af810e857
   * - Ownership: CHARLIE
   */
  const clusterProxyCell = await getClusterProxyById('0x484a439338ebe0ef6f953ead4273a59fc5972d31e67e7e51e7a9c01af810e857', config);

  const { txSkeleton, outputIndex } = await createClusterAgent({
    clusterProxyOutPoint: clusterProxyCell.outPoint!,
    /**
     * Decide how to reference the target ClusterProxy:
     * - 'cell': Reference the ClusterProxy (Cell or LockProxy) directly
     * - 'payment': Pay the owner of the ClusterProxy a fee to use it without permission/signature
     */
    referenceType: 'payment',
    /**
     * If referenceType == 'payment', you can specify the payment amount (in shannons),
     * and the default amount is 10^ClusterProxyArgs.minPayment if not specified.
     */
    paymentAmount: BI.from(100_0000_0000),
    fromInfos: [ALICE.address],
    toLock: ALICE.lock,
    config,
  });

  const hash = await ALICE.signAndSendTransaction(txSkeleton);
  console.log('CreateClusterAgent transaction sent, hash:', hash);
  console.log('ClusterAgent output index:', outputIndex);
})();
