import { describe, expect, it, afterAll } from 'vitest';
import { BI } from '@ckb-lumos/lumos';
import { getSporeScript } from '../config';
import { unpackToRawMutantArgs } from '../codec';
import { bufferToRawString, bytifyRawString } from '../helpers';
import { createSpore, transferSpore, meltSpore, getSporeByOutPoint, getMutantById } from '../api';
import { expectCellDep, expectTypeId, expectTypeCell, expectCellLock } from './helpers';
import { getSporeOutput, popRecord, retryQuery, signAndSendTransaction, OutPointRecord } from './helpers';
import { TEST_ACCOUNTS, TEST_ENV, SPORE_OUTPOINT_RECORDS, cleanupRecords } from './shared';

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

      const hash = await signAndSendTransaction({
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

      const hash = await signAndSendTransaction({
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

      const hash = await signAndSendTransaction({
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

      const hash = await signAndSendTransaction({
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

      const hash = await signAndSendTransaction({
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
        signAndSendTransaction({
          account: sporeRecord.account,
          txSkeleton,
          config,
          rpc,
          send: true,
        }),
      ).rejects.toThrow();
    }, 0);
  });

  // TODO: Skip Mutant tests due to feature implementation incomplete
  describe.skip('Spore with Mutant', () => {
    it('Create a Spore with Mutant', async () => {
      const immortalMutantId = '0x79713beaf43310d4d9c838811553399f3e7c114353d4788de3ed2a165e288c11';

      const { txSkeleton, outputIndex, reference, mutantReference } = await createSpore({
        data: {
          contentType: 'text/plain',
          content: bytifyRawString('content'),
          contentTypeParameters: {
            mutant: [immortalMutantId],
          },
        },
        fromInfos: [CHARLIE.address],
        toLock: CHARLIE.lock,
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.data.contentType).toEqual(`text/plain;mutant[]=${immortalMutantId.slice(2)}`);

      expect(reference).toBeDefined();
      expect(reference.referenceTarget).toEqual('none');

      expect(mutantReference).toBeDefined();
      const mutantCell = await getMutantById(immortalMutantId, config);
      const mutantArgs = unpackToRawMutantArgs(mutantCell.cellOutput.type!.args);
      if (mutantArgs.minPayment !== void 0) {
        expect(mutantReference!.referenceType).toEqual('payment');
        expect(mutantReference!.payment).toBeDefined();
        expect(mutantReference!.payment!.outputIndices.length).toEqual(1);
        const paymentCell = txSkeleton.get('outputs').get(mutantReference!.payment!.outputIndices[0]);
        expect(BI.from(paymentCell!.cellOutput.capacity).gte(BI.from(10).pow(mutantArgs.minPayment))).toEqual(true);
        expect(paymentCell!.cellOutput.lock).toEqual(mutantCell.cellOutput.lock);
      } else {
        expect(mutantReference!.referenceType).toEqual('none');
      }

      const hash = await signAndSendTransaction({
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
    it('Create a Spore with Mutant required Cluster', async () => {
      const { txSkeleton, outputIndex, reference, mutantReference } = await createSpore({
        data: {
          contentType: 'text/plain',
          content: bytifyRawString('content'),
          clusterId: '0x',
          contentTypeParameters: {
            mutant: ['0x'],
          },
        },
        fromInfos: [CHARLIE.address],
        toLock: CHARLIE.lock,
        config,
      });

      console.log('Spore Reference:', reference);
      console.log('Spore MutantReference:', mutantReference);

      await signAndSendTransaction({
        account: CHARLIE,
        txSkeleton,
        config,
        rpc,
        send: false,
      });
    }, 0);
  });
});
