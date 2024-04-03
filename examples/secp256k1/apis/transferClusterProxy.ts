import { transferClusterProxy, getClusterProxyById } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE, ALICE } = accounts;

  const clusterProxyCell = await getClusterProxyById('0x<cluster_proxy_id>', config);

  const { txSkeleton, outputIndex } = await transferClusterProxy({
    outPoint: clusterProxyCell.outPoint!,
    fromInfos: [CHARLIE.address],
    toLock: ALICE.lock,
    /**
     * The ClusterProxyArgs.minPayment is modifiable during transfer
     */
    minPayment: 10,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('TransferClusterProxy transaction sent, hash:', hash);
  console.log('ClusterProxy output index:', outputIndex);
})();
