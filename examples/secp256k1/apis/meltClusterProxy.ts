import { meltClusterProxy, getClusterProxyById } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

(async function main() {
  const { CHARLIE } = accounts;

  const clusterProxyCell = await getClusterProxyById('0x<cluster_proxy_id>', config);

  const { txSkeleton } = await meltClusterProxy({
    outPoint: clusterProxyCell.outPoint!,
    changeAddress: CHARLIE.address,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('MeltClusterProxy transaction sent, hash:', hash);
})();
