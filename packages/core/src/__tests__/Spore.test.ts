import { describe, expect, it, afterAll } from 'vitest';
import { BI } from '@ckb-lumos/lumos';
import { getSporeScript } from '../config';
import { unpackToRawMutantArgs } from '../codec';
import { bufferToRawString, bytifyRawString } from '../helpers';
import {
  createSpore,
  transferSpore,
  meltSpore,
  getSporeByOutPoint,
  getMutantById,
  createCluster,
  getClusterByOutPoint,
} from '../api';
import { expectCellDep, expectTypeId, expectTypeCell, expectCellLock } from './helpers';
import { getSporeOutput, popRecord, retryQuery, signAndOrSendTransaction, OutPointRecord } from './helpers';
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
          content: bytifyRawString('content'),
        },
        toLock: CHARLIE.lock,
        fromInfos: [CHARLIE.address],
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.cell!.cellOutput.lock).toEqual(CHARLIE.lock);
      expectTypeId(txSkeleton, outputIndex, spore.id);
      expect(spore.data.contentType).toEqual('text/plain');
      expect(bufferToRawString(spore.data.content)).toEqual('content');

      expectTypeCell(txSkeleton, 'output', spore.cell.cellOutput.type!);
      expectCellDep(txSkeleton, spore.script.cellDep);

      expect(reference).toBeDefined();
      expect(reference.referenceTarget).toEqual('none');

      const { hash } = await signAndOrSendTransaction({
        account: CHARLIE,
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
          account: CHARLIE,
        });
      }
    }, 0);
    it('Transfer a Spore', async () => {
      const sporeRecord = existingSporeRecord ?? popRecord(SPORE_OUTPOINT_RECORDS, true);
      const sporeCell = await retryQuery(() => getSporeByOutPoint(sporeRecord.outPoint, config));

      expectCellLock(sporeCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = sporeRecord.account.address === ALICE.address ? CHARLIE : ALICE;

      const { txSkeleton, outputIndex } = await transferSpore({
        outPoint: sporeCell.outPoint!,
        fromInfos: [sporeRecord.account.address],
        toLock: oppositeAccount.lock,
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.cell.cellOutput.lock).toEqual(oppositeAccount.lock);

      expectTypeCell(txSkeleton, 'both', spore.cell.cellOutput.type!);
      expectCellDep(txSkeleton, spore.script.cellDep);

      const { hash } = await signAndOrSendTransaction({
        account: sporeRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingSporeRecord = void 0;
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: ALICE,
        });
      }
    }, 0);
    it('Melt a Spore', async () => {
      const sporeRecord = existingSporeRecord ?? popRecord(SPORE_OUTPOINT_RECORDS, true);
      const sporeCell = await retryQuery(() => getSporeByOutPoint(sporeRecord.outPoint, config));

      const { txSkeleton } = await meltSpore({
        outPoint: sporeCell.outPoint!,
        changeAddress: CHARLIE.address,
        config,
      });

      expectTypeCell(txSkeleton, 'input', sporeCell.cellOutput.type!);

      const changeCell = txSkeleton.get('outputs').get(0);
      expect(changeCell).toBeDefined();
      expect(changeCell!.cellOutput.lock).toEqual(CHARLIE.lock);

      const sporeScript = getSporeScript(config, 'Spore', sporeCell.cellOutput.type!);
      expectCellDep(txSkeleton, sporeScript.cellDep);

      const { hash } = await signAndOrSendTransaction({
        account: sporeRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingSporeRecord = void 0;
      }
    }, 0);
  });

  describe('Spore with immortal mutant', () => {
    let existingSporeRecord: OutPointRecord | undefined;
    it('Create an immortal Spore', async () => {
      const { txSkeleton, outputIndex } = await createSpore({
        data: {
          contentType: 'text/plain',
          content: bytifyRawString('immortal'),
          contentTypeParameters: {
            immortal: true,
          },
        },
        toLock: CHARLIE.lock,
        fromInfos: [CHARLIE.address],
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.cell!.cellOutput.lock).toEqual(CHARLIE.lock);
      expect(spore.data.contentType).toEqual('text/plain;immortal=true');
      expect(bufferToRawString(spore.data.content)).toEqual('immortal');

      const { hash } = await signAndOrSendTransaction({
        account: CHARLIE,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingSporeRecord = {
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: CHARLIE,
        };
      }
    }, 0);
    it('Transfer an immortal Spore', async () => {
      expect(existingSporeRecord).toBeDefined();
      const sporeRecord = existingSporeRecord!;
      const sporeCell = await retryQuery(() => getSporeByOutPoint(sporeRecord!.outPoint, config));

      expectCellLock(sporeCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = sporeRecord.account.address === ALICE.address ? CHARLIE : ALICE;

      const { txSkeleton, outputIndex } = await transferSpore({
        outPoint: sporeCell.outPoint!,
        fromInfos: [sporeRecord.account.address],
        toLock: oppositeAccount.lock,
        config,
      });

      const { hash } = await signAndOrSendTransaction({
        account: sporeRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingSporeRecord = {
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: oppositeAccount,
        };
      }
    }, 0);
    it('Try melt an immortal Spore', async () => {
      expect(existingSporeRecord).toBeDefined();
      const sporeRecord = existingSporeRecord!;
      const sporeCell = await retryQuery(() => getSporeByOutPoint(sporeRecord!.outPoint, config));

      const { txSkeleton } = await meltSpore({
        outPoint: sporeCell.outPoint!,
        changeAddress: CHARLIE.address,
        config,
      });

      await expect(
        signAndOrSendTransaction({
          account: sporeRecord.account,
          txSkeleton,
          config,
          rpc,
          send: true,
        }),
      ).rejects.toThrow();
    }, 0);
  });

  describe('Spore melt and mint in one transaction', () => {
    let existingSporeRecord: OutPointRecord | undefined;
    let existingClusterRecord: OutPointRecord | undefined;

    it('Create a Cluster', async () => {
      const { txSkeleton, outputIndex } = await createCluster({
        data: {
          name: 'dob cluster',
          description: 'Testing only',
        },
        fromInfos: [CHARLIE.address],
        toLock: CHARLIE.lock,
        config,
      });

      const { hash } = await signAndOrSendTransaction({
        account: CHARLIE,
        txSkeleton,
        config,
        rpc,
        send: true,
      });

      if (hash) {
        existingClusterRecord = {
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: CHARLIE,
        };
      }
    }, 60000);

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

      const { hash } = await signAndOrSendTransaction({
        account: ALICE,
        txSkeleton,
        config,
        rpc,
        send: true,
      });

      if (hash) {
        existingSporeRecord = {
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: ALICE,
        };
      }
    }, 60000);

    it('Melt and Create a Spore', async () => {
      console.log('check for spore cell: ', existingSporeRecord);
      expect(existingSporeRecord).toBeDefined();
      const sporeRecord = existingSporeRecord!;
      const sporeCell = await retryQuery(() => getSporeByOutPoint(sporeRecord.outPoint, config));

      console.log('check for cluster cell: ', existingClusterRecord);
      expect(existingClusterRecord).toBeDefined();
      const clusterRecord = existingClusterRecord!;
      const clusterCell = await retryQuery(() => getClusterByOutPoint(clusterRecord.outPoint, config));
      const clusterId = clusterCell.cellOutput.type!.args;

      const { txSkeleton, outputIndex } = await meltThenCreateSpore({
        data: {
          contentType: 'text/plain',
          content: bytifyRawString('dob spore'),
          clusterId,
        },
        toLock: CHARLIE.lock,
        fromInfos: [CHARLIE.address],
        outPoint: sporeCell.outPoint!,
        changeAddress: CHARLIE.address,
        config,
      });

      const { txSkeleton: aliceSignedTxSkeleton } = await signAndOrSendTransaction({
        account: ALICE,
        txSkeleton,
        config,
        send: false,
      });
      const { hash } = await signAndOrSendTransaction({
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
    }, 90000);
  });
});
