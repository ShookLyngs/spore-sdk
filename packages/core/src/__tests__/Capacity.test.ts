import { describe, expect, it } from 'vitest';
import { Cell } from '@ckb-lumos/base';
import { BI, helpers } from '@ckb-lumos/lumos';
import { common } from '@ckb-lumos/common-scripts';
import { TEST_ACCOUNTS, TEST_ENV } from './shared';
import {
  getMinFeeRate,
  calculateFeeByTransactionSkeleton,
  createCapacitySnapshotFromTransactionSkeleton,
  injectCapacityAndPayFee,
  returnExceededCapacity,
  payFeeByOutput,
} from '../helpers';

describe(
  'Capacity',
  function () {
    const { config, rpc, indexer } = TEST_ENV;
    const { CHARLIE } = TEST_ACCOUNTS;

    it('Normal capacity collection', async () => {
      let txSkeleton = new helpers.TransactionSkeleton({
        cellProvider: indexer,
      });

      txSkeleton = txSkeleton.update('outputs', (outputs) => {
        return outputs.push({
          cellOutput: {
            capacity: BI.from(100_0000_0000).toHexString(),
            lock: CHARLIE.lock,
          },
          data: '0x',
        });
      });

      txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
        return fixedEntries.push({
          field: 'outputs',
          index: 0,
        });
      });

      const injected = await injectCapacityAndPayFee({
        fromInfos: [CHARLIE.address],
        txSkeleton,
        config,
      });

      txSkeleton = injected.txSkeleton;
      const { before: beforeSnap, after: afterSnap } = injected;
      expect(afterSnap.inputsLength - beforeSnap.inputsLength).toBeGreaterThanOrEqual(1);
      expect(afterSnap.outputsLength - beforeSnap.outputsLength).toBeGreaterThanOrEqual(1);

      const feeRate = await getMinFeeRate(rpc);
      const fee = calculateFeeByTransactionSkeleton(txSkeleton, feeRate);
      expect(afterSnap.inputsRemainCapacity.eq(fee)).toEqual(true);
    }, 30000);
    it('No capacity collection, only returning exceeded capacity', async () => {
      let txSkeleton = new helpers.TransactionSkeleton({
        cellProvider: indexer,
      });

      const expectCapacity = BI.from(100_0000_0000).toHexString();
      const collector = indexer.collector({
        lock: CHARLIE.lock,
        outputDataLenRange: ['0x0', '0x1'],
      });

      let collectedCell: Cell | undefined;
      let collectedCapacity: BI | undefined;
      for await (const cell of collector.collect()) {
        collectedCapacity = BI.from(cell.cellOutput.capacity);
        collectedCell = cell;
        break;
      }
      expect(collectedCell).toBeDefined();
      expect(collectedCapacity).toBeDefined();

      // Add cell to inputs and outputs,
      // and then remove the cell from outputs because not needed
      txSkeleton = await common.setupInputCell(txSkeleton, collectedCell!, CHARLIE.address, {
        config: config.lumos,
      });
      txSkeleton = txSkeleton.update('outputs', (outputs) => {
        return outputs.remove(0);
      });
      expect(txSkeleton.get('inputs').size).toEqual(1);
      expect(txSkeleton.get('outputs').size).toEqual(0);

      const returned = returnExceededCapacity({
        changeAddress: CHARLIE.address,
        config: config.lumos,
        txSkeleton,
      });

      txSkeleton = returned.txSkeleton;
      expect(returned.returnedChange).toEqual(true);
      expect(returned.createdChangeCell).toEqual(true);
      expect(returned.changeCellOutputIndex).toEqual(0);

      const snapshot = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);
      expect(snapshot.outputsCapacity.eq(collectedCapacity!)).toEqual(true);
      expect(snapshot.inputsRemainCapacity.eq(0)).toEqual(true);

      const feeRate = await getMinFeeRate(rpc);
      const fee = calculateFeeByTransactionSkeleton(txSkeleton, feeRate);
      txSkeleton = await payFeeByOutput({
        outputIndex: 0,
        txSkeleton,
        config,
      });

      const paidSnap = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);
      expect(paidSnap.inputsRemainCapacity.eq(fee)).toEqual(true);
    }, 30000);
  },
  {
    concurrent: true,
  },
);
