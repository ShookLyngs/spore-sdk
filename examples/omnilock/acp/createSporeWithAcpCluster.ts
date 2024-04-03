import { BI } from '@ckb-lumos/bi';
import { createSpore } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';
import { getInfoFromOmnilockArgs } from '../utils/wallet';

(async function main() {
  const { CHARLIE } = accounts;

  const { txSkeleton, outputIndex } = await createSpore({
    data: {
      contentType: 'text/plain',
      content: 'spore with public cluster referenced',
      /**
       * When referencing an ACP public Cluster, even if the Cluster doesn't belong to CHARLIE,
       * CHARLIE can still create Spores that reference the Cluster.
       */
      clusterId: '0x6c7df3eee9af40d4e0f27356e7dcb02a54e33f7d81a40af57d0de1f3856ab750',
    },
    toLock: CHARLIE.lock,
    fromInfos: [CHARLIE.address],
    cluster: {
      /**
       * When referencing an Omnilock ACP public Cluster,
       * you must pay at least (10^minCKB) shannons to the Cluster cell as a fee.
       *
       * Every Omnilock ACP lock script has a minCkb value defined in its args.
       * The minimal viable minCkb is 0, which means the minimum payment is 1 (10^0) shannon.
       */
      capacityMargin: (clusterCell, margin) => {
        const args = getInfoFromOmnilockArgs(clusterCell.cellOutput.lock.args);
        const minCkb = args.minCkb !== void 0
          ? BI.from(10).pow(args.minCkb)
          : BI.from(0);

        return margin.add(minCkb);
      },
      /**
       * When referencing an ACP public Cluster,
       * the Cluster's corresponding witness should be set to "0x" (empty) and shouldn't be signed.
       */
      updateWitness: '0x',
    },
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('CreateSporeWithAcpCluster transaction sent, hash:', hash);
  console.log('Spore output index:', outputIndex);

  const sporeCell = txSkeleton.get('outputs').get(outputIndex)!;
  console.log('Spore ID:', sporeCell.cellOutput.type!.args);
})();
