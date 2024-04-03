import { BI } from '@ckb-lumos/bi';
import { number } from '@ckb-lumos/codec';
import { createSpore } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

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
      clusterId: '0x4bb8ccd6dc886da947cbe8ac4d51004c9d5335ae1216fda756ac39e4bf665c22',
    },
    toLock: CHARLIE.lock,
    fromInfos: [CHARLIE.address],
    cluster: {
      /**
       * When referencing an ACP public Cluster,
       * you may have to pay at least (10^minCKB) shannons to the Cluster cell as a fee.
       */
      capacityMargin: (clusterCell, margin) => {
        const argsMinCkb = clusterCell.cellOutput.lock.args.slice(42, 2);
        const minCkb = argsMinCkb.length === 2
          ? BI.from(10).pow(number.Uint8.unpack(`0x${argsMinCkb}`))
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
