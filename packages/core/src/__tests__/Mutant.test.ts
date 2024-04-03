import { describe, it } from 'vitest';
import { bufferToRawString } from '../helpers';
import { createMutant, getMutantById, transferMutant } from '../api';
import { fetchLocalFile, signAndSendTransaction } from './helpers';
import { TEST_ACCOUNTS, TEST_ENV } from './shared';

describe.skip('Mutant', function () {
  const { rpc, config } = TEST_ENV;
  const { CHARLIE, ALICE } = TEST_ACCOUNTS;

  it('Create a Mutant', async function () {
    /**
     * [#1] Immortal Mutant can apply rules to the Spore:
     * - Spore with this Mutant applied cannot be melted from the blockchain
     * - Function exactly like the internal immortal feature, but throws a different error code
     * - Check logic: if (spore_ext_mode == 3) throw error(86)
     */
    const code = await fetchLocalFile('./resources/immortalMutant.lua', __dirname);
    /**
     * [#2] No Transfer Mutant can apply rules to make the Spore:
     * - Spore with this Mutant applied, cannot be transferred.
     * - Check logic: if (spore_ext_mode == 2) throw error(88)
     */
    // const code = await fetchLocalFile('./resources/noTransferMutant.lua', __dirname);
    /**
     * [#3] Must Transfer Mutant can apply rules to make the Spore:
     * - Spore with this Mutant applied, when transferring, cannot be transferred to the original owner
     * - Check logic: if (spore_ext_mode == 2 and spore_input_lock_hash == spore_output_lock_hash) throw error(87)
     */
    // const code = await fetchLocalFile('./resources/mustTransferMutant.lua', __dirname);
    /**
     * [#4] Second Output Mutant can apply rules to the Spore:
     * - Spore with this Mutant applied, the output's index must be zero (0x0)
     * - Check logic: if (spore_output_index > 0) throw error(89)
     */
    // const code = await fetchLocalFile('./resources/firstOutputMutant.lua', __dirname);

    const { txSkeleton } = await createMutant({
      data: code.bytes,
      minPayment: 10,
      toLock: ALICE.lock,
      fromInfos: [ALICE.address],
      config,
    });

    // Sign and send transaction
    await signAndSendTransaction({
      account: ALICE,
      txSkeleton,
      config,
      rpc,
      send: true,
    });
  }, 30000);

  it('Transfer a Mutant', async function () {
    const mutantCell = await getMutantById(
      '0x3bcc400d150b8af81637c688b90fc662e01646826f44d3099ceb0ab729284001',
      config,
    );

    const { txSkeleton, outputIndex } = await transferMutant({
      outPoint: mutantCell.outPoint!,
      minPayment: 10,
      toLock: CHARLIE.lock,
      config,
    });

    // Sign and send transaction
    await signAndSendTransaction({
      account: ALICE,
      txSkeleton,
      config,
      rpc,
      send: true,
    });
  }, 30000);

  it('Get a Mutant', async () => {
    const mutantCell = await getMutantById(
      '0x87a5bad1849ba09237bdd62209b538c3f39b27ba6dceefd040d5f9f71f6adfb5',
      config,
    );
    console.log(mutantCell.outPoint);

    const data = bufferToRawString(mutantCell.data);
    console.log('raw code:', data);
  });
});
