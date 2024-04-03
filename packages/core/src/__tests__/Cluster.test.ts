import { afterAll, describe, expect, it } from 'vitest';
import { BI } from '@ckb-lumos/lumos';
import { getSporeScript } from '../config';
import { bytifyRawString, waitForMilliseconds } from '../helpers';
import { expectTypeId, expectCellDep, expectTypeCell, expectLockCell } from './helpers';
import { signAndSendTransaction, popRecord, OutPointRecord, IdRecord } from './helpers';
import { retryQuery, getSporeOutput, getClusterOutput, expectCellLock } from './helpers';
import { createCluster, createSpore, getClusterById, getClusterByOutPoint, transferCluster } from '../api';
import {
  TEST_ENV,
  TEST_ACCOUNTS,
  TEST_VARIABLES,
  SPORE_OUTPOINT_RECORDS,
  CLUSTER_OUTPOINT_RECORDS,
  cleanupRecords,
} from './shared';

describe('Cluster', () => {
  const { rpc, config, v1Config } = TEST_ENV;
  const { CHARLIE, ALICE } = TEST_ACCOUNTS;

  let existingClusterRecord: OutPointRecord | undefined;

  afterAll(async () => {
    await cleanupRecords({
      name: 'Cluster',
    });
  }, 0);

  describe('Cluster basics', () => {
    it('Create a Cluster', async () => {
      const { txSkeleton, outputIndex } = await createCluster({
        data: {
          name: 'Testnet Spores',
          description: 'Testing only',
        },
        fromInfos: [CHARLIE.address],
        toLock: CHARLIE.lock,
        config,
      });

      const cluster = getClusterOutput(txSkeleton, outputIndex, config);
      expect(cluster.cell.cellOutput.lock).toEqual(CHARLIE.lock);
      expectTypeId(txSkeleton, outputIndex, cluster.id);
      expect(cluster.data.name).toEqual('Testnet Spores');
      expect(cluster.data.description).toEqual('Testing only');

      expectTypeCell(txSkeleton, 'output', cluster.cell.cellOutput.type!);
      expectCellDep(txSkeleton, cluster.script.cellDep);

      const hash = await signAndSendTransaction({
        account: CHARLIE,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        CLUSTER_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: CHARLIE,
        });
      }
    }, 0);
    it('Transfer a Cluster', async () => {
      const clusterRecord = existingClusterRecord ?? popRecord(CLUSTER_OUTPOINT_RECORDS, true);
      const clusterCell = await retryQuery(() => getClusterByOutPoint(clusterRecord.outPoint, config));

      expectCellLock(clusterCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterRecord.account.address === ALICE.address ? CHARLIE : ALICE;

      const { txSkeleton, outputIndex } = await transferCluster({
        outPoint: clusterCell.outPoint!,
        fromInfos: [clusterRecord.account.address],
        toLock: oppositeAccount.lock,
        config,
      });

      const cluster = getClusterOutput(txSkeleton, outputIndex, config);
      expect(cluster.cell.cellOutput.lock).toEqual(oppositeAccount.lock);

      expectTypeCell(txSkeleton, 'both', cluster.cell.cellOutput.type!);
      expectCellDep(txSkeleton, cluster.script.cellDep);

      const hash = await signAndSendTransaction({
        account: clusterRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterRecord = void 0;
        CLUSTER_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: oppositeAccount,
        });
      }
    }, 0);
  });

  describe('Spore with Cluster (latest)', () => {
    it('Create a Spore with Cluster (via lock proxy)', async () => {
      const clusterRecord = existingClusterRecord ?? popRecord(CLUSTER_OUTPOINT_RECORDS, true);
      const clusterCell = await retryQuery(() => getClusterByOutPoint(clusterRecord.outPoint, config));
      const clusterId = clusterCell.cellOutput.type!.args;

      const { txSkeleton, outputIndex, reference } = await createSpore({
        data: {
          clusterId,
          contentType: 'text/plain',
          content: bytifyRawString('content'),
        },
        fromInfos: [clusterRecord.account.address],
        toLock: CHARLIE.lock,
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.data.clusterId).toEqual(clusterId);

      expect(reference).toBeDefined();
      expect(reference.referenceTarget).toEqual('cluster');
      expect(reference.referenceType).toEqual('lockProxy');

      expectLockCell(txSkeleton, 'both', clusterCell.cellOutput.lock);

      const clusterScript = getSporeScript(config, 'Cluster', clusterCell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndSendTransaction({
        account: clusterRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterRecord = void 0;
        CLUSTER_OUTPOINT_RECORDS.push(clusterRecord);
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: CHARLIE,
        });
      }
    }, 0);
    it('Create a Spore with Cluster (via cell reference)', async () => {
      const clusterRecord = existingClusterRecord ?? popRecord(CLUSTER_OUTPOINT_RECORDS, true);
      const clusterCell = await retryQuery(() => getClusterByOutPoint(clusterRecord.outPoint, config));
      const clusterId = clusterCell.cellOutput.type!.args;

      expectCellLock(clusterCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterRecord.account.address === ALICE.address ? CHARLIE : ALICE;

      const { txSkeleton, outputIndex, reference } = await createSpore({
        data: {
          clusterId,
          contentType: 'text/plain',
          content: bytifyRawString('content'),
        },
        toLock: clusterRecord.account.lock,
        fromInfos: [oppositeAccount.address],
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.data.clusterId).toEqual(clusterId);

      expect(reference).toBeDefined();
      expect(reference.referenceTarget).toEqual('cluster');
      expect(reference.referenceType).toEqual('cell');

      expect(reference.cluster).toBeDefined();
      expect(reference.cluster).toHaveProperty('inputIndex');
      expect(reference.cluster).toHaveProperty('outputIndex');

      const cluster = getClusterOutput(txSkeleton, reference.cluster!.outputIndex, config);
      expectTypeCell(txSkeleton, 'both', cluster.cell.cellOutput.type!);
      expect(cluster.id).toEqual(clusterId);

      const clusterScript = getSporeScript(config, 'Cluster', clusterCell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndSendTransaction({
        account: [oppositeAccount, clusterRecord.account],
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterRecord = void 0;
        CLUSTER_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(reference.cluster!.outputIndex).toHexString(),
          },
          account: clusterRecord.account,
        });
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: clusterRecord.account,
        });
      }
    }, 0);
  });

  describe.runIf(TEST_VARIABLES.tests.clusterV1)('Spore with Cluster (v1)', () => {
    let clusterV1OutPointRecord: OutPointRecord | undefined;
    const clusterV1IdRecord: IdRecord = {
      id: '0x8b9f893397310a3bbd925cd1c9ab606555675bb2d03f3c5cb934f2ba4ef97e93',
      account: CHARLIE,
    };

    async function getClusterV1Record() {
      if (TEST_VARIABLES.network === 'devnet') {
        expect(clusterV1OutPointRecord).toBeDefined();
        return {
          cell: await getClusterByOutPoint(clusterV1OutPointRecord!.outPoint, config),
          account: clusterV1OutPointRecord!.account,
        };
      } else {
        expect(clusterV1IdRecord).toBeDefined();
        const cell = await getClusterById(clusterV1IdRecord.id, config);
        return {
          cell: await getClusterByOutPoint(cell.outPoint!, config),
          account: clusterV1IdRecord.account,
        };
      }
    }

    it.runIf(TEST_VARIABLES.network === 'devnet')(
      'Create a Cluster (v1) if necessary',
      async () => {
        // Wait some time for the indexer to be updated
        await waitForMilliseconds(1500);

        const { txSkeleton, outputIndex } = await createCluster({
          data: {
            name: 'Testnet Spores',
            description: 'Testing only',
          },
          fromInfos: [CHARLIE.address],
          toLock: CHARLIE.lock,
          config: v1Config,
        });

        const clusterOutput = getClusterOutput(txSkeleton, outputIndex, v1Config);
        const clusterScript = clusterOutput.script;

        expect(clusterScript).toHaveProperty('tags');
        expect(clusterScript.tags).toContain('v1');

        const hash = await signAndSendTransaction({
          account: CHARLIE,
          txSkeleton,
          rpc,
          send: true,
          config: v1Config,
        });

        if (hash) {
          clusterV1OutPointRecord = {
            outPoint: {
              txHash: hash,
              index: BI.from(outputIndex).toHexString(),
            },
            account: CHARLIE,
          };
        }
      },
      0,
    );
    it('Create a Spore with Cluster (via lock proxy)', async () => {
      const { cell: clusterCell, account: recordAccount } = await retryQuery(getClusterV1Record);

      expectCellLock(clusterCell, [CHARLIE.lock, ALICE.lock]);
      const clusterId = clusterCell.cellOutput.type!.args;

      await expect(() =>
        createSpore({
          data: {
            clusterId: clusterId,
            contentType: 'text/plain',
            content: bytifyRawString('content'),
          },
          toLock: recordAccount.lock,
          fromInfos: [recordAccount.address],
          config,
        }),
      ).rejects.toThrowError('Cannot reference Cluster because target Cluster does not supported lockProxy');
    }, 0);
    it('Create a Spore with Cluster (via cell reference)', async () => {
      const { cell: clusterCell, account: recordAccount } = await retryQuery(getClusterV1Record);

      expectCellLock(clusterCell, [CHARLIE.lock, ALICE.lock]);

      const clusterId = clusterCell.cellOutput.type!.args;
      const oppositeAccount = recordAccount.address === ALICE.address ? CHARLIE : ALICE;

      if (TEST_VARIABLES.network !== 'devnet') {
        // TODO: Wait for some block times to prevent double-spend, should resolve issue#25
        await waitForMilliseconds(20000);
      }

      const { txSkeleton, outputIndex, reference } = await createSpore({
        data: {
          clusterId: clusterId,
          contentType: 'text/plain',
          content: bytifyRawString('content'),
        },
        toLock: recordAccount.lock,
        fromInfos: [oppositeAccount.address],
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.data.clusterId).toEqual(clusterId);

      expect(reference).toBeDefined();
      expect(reference.referenceTarget).toEqual('cluster');
      expect(reference.referenceType).toEqual('cell');

      expect(reference.cluster).toBeDefined();
      expect(reference.cluster).toHaveProperty('inputIndex');
      expect(reference.cluster).toHaveProperty('outputIndex');

      const cluster = getClusterOutput(txSkeleton, reference.cluster!.outputIndex, config);
      expectTypeCell(txSkeleton, 'both', cluster.cell.cellOutput.type!);
      expect(cluster.id).toEqual(clusterId);

      const clusterScript = getSporeScript(config, 'Cluster', cluster.cell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterCell.outPoint!,
        depType: 'code',
      });

      const hash = await signAndSendTransaction({
        account: [oppositeAccount, recordAccount],
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        clusterV1OutPointRecord = {
          outPoint: {
            txHash: hash,
            index: BI.from(reference.cluster!.outputIndex).toHexString(),
          },
          account: recordAccount,
        };
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: recordAccount,
        });
      }
    }, 0);
  });
});
