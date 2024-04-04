import { describe, expect, it, afterAll } from 'vitest';
import { BI } from '@ckb-lumos/lumos';
import { getSporeScript } from '../config';
import { unpackToRawMutantArgs } from '../codec';
import { bufferToRawString, bytifyRawString } from '../helpers';
import { createSpore, transferSpore, meltSpore, getSporeByOutPoint, getMutantById } from '../api';
import { expectCellDep, expectTypeId, expectTypeCell, expectCellLock } from './helpers';
import { getSporeOutput, popRecord, retryQuery, signAndSendTransaction, OutPointRecord } from './helpers';
import { TEST_ACCOUNTS, TEST_ENV, SPORE_OUTPOINT_RECORDS, cleanupRecords } from './shared';
import { meltThenCreateSpore } from '../api/composed/spore/meltThenCreateSpore';

describe('Spore', () => {
  const { rpc, config } = TEST_ENV;
  const { CHARLIE, ALICE } = TEST_ACCOUNTS;
  afterAll(async () => {
    await cleanupRecords({
      name: 'Spore',
    });
  }, 0);
  describe('Spore basics', () => {
    let existingSporeRecord: OutPointRecord | undefined;
    it('Create a Spore', async () => {
      const { txSkeleton, outputIndex, reference } = await createSpore({
        data: {
          contentType: 'text/plain',
          content: bytifyRawString('blind box spore'),
        },
        toLock: ALICE.lock,
        fromInfos: [ALICE.address],
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.cell!.cellOutput.lock).toEqual(ALICE.lock);
      expectTypeId(txSkeleton, outputIndex, spore.id);
      expectCellDep(txSkeleton, spore.script.cellDep);
      expectTypeCell(txSkeleton, 'output', spore.cell.cellOutput.type!);

      expect(reference).toBeDefined();
      expect(reference.referenceTarget).toEqual('none');

      const hash = await signAndSendTransaction({
        account: ALICE,
        txSkeleton,
        config,
        rpc,
        send: true,
      });

      if (hash) {
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: ALICE,
        });
      }
    }, 0);

    it('Melt and Create a Spore', async () => {
      const sporeRecord = existingSporeRecord ?? popRecord(SPORE_OUTPOINT_RECORDS, true);
      const sporeCell = await retryQuery(() => getSporeByOutPoint(sporeRecord.outPoint, config));
      console.log('old spore cell: ', sporeCell);
      const { txSkeleton, outputIndex } = await meltThenCreateSpore({
        data: {
          contentType: 'text/plain',
          content: bytifyRawString('dob spore'),
        },
        toLock: CHARLIE.lock,
        fromInfos: [CHARLIE.address],
        outPoint: sporeCell.outPoint!,
        changeAddress: CHARLIE.address,
        config,
      });

      const aliceSignedTxSkeleton = ALICE.signTransaction(txSkeleton);
      const hash = await signAndSendTransaction({
        account: CHARLIE,
        txSkeleton: aliceSignedTxSkeleton,
        config,
        rpc,
        send: true,
      });

      if (hash) {
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: CHARLIE,
        });
      }
    }, 30000);
  });
});
