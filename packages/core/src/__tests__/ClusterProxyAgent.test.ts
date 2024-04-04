import { afterAll, describe, expect, it } from 'vitest';
import { BI, utils } from '@ckb-lumos/lumos';
import { getSporeScript } from '../config';
import { bytifyRawString, minimalCellCapacityByLock, waitForMilliseconds } from '../helpers';
import { packRawClusterAgentDataToHash, unpackToRawClusterProxyArgs } from '../codec';
import { createSpore, createCluster, getClusterByOutPoint, getClusterById } from '../api';
import { createClusterProxy, transferClusterProxy, meltClusterProxy, getClusterProxyByOutPoint } from '../api';
import { createClusterAgent, transferClusterAgent, meltClusterAgent, getClusterAgentByOutPoint } from '../api';
import { expectCellDep, expectLockCell, expectTypeCell, expectTypeId, expectCellLock } from './helpers';
import { getClusterAgentOutput, getSporeOutput, getClusterProxyOutput, IdRecord } from './helpers';
import { signAndOrSendTransaction, retryQuery, popRecord, OutPointRecord } from './helpers';
import { getClusterOutput, getActionsFromCobuildWitnessLayout } from './helpers';
import { createSporeScriptInfoFromTemplate, ScriptInfo } from '../cobuild';
import {
  TEST_ENV,
  TEST_ACCOUNTS,
  TEST_VARIABLES,
  SPORE_OUTPOINT_RECORDS,
  CLUSTER_OUTPOINT_RECORDS,
  CLUSTER_PROXY_OUTPOINT_RECORDS,
  CLUSTER_AGENT_OUTPOINT_RECORDS,
  cleanupRecords,
} from './shared';

describe('ClusterProxy and ClusterAgent', () => {
  const { rpc, config, v1Config } = TEST_ENV;
  const { CHARLIE, ALICE } = TEST_ACCOUNTS;

  let existingClusterRecord: OutPointRecord | undefined;
  let existingClusterProxyRecord: OutPointRecord | undefined;
  let existingClusterAgentRecord: OutPointRecord | undefined;

  afterAll(async () => {
    await cleanupRecords({
      name: 'ClusterProxyAgent',
    });
  }, 0);

  describe('ClusterProxy basics', () => {
    it.skipIf(existingClusterRecord !== void 0 || CLUSTER_OUTPOINT_RECORDS.length > 0)(
      'Create a Cluster (if necessary)',
      async ({ skip }) => {
        if (existingClusterRecord !== void 0 || CLUSTER_OUTPOINT_RECORDS.length > 0) {
          console.log('skipping test');
          return skip();
        }

        const { txSkeleton, outputIndex } = await createCluster({
          data: {
            name: 'Testnet Spores',
            description: 'Testing only',
          },
          fromInfos: [CHARLIE.address],
          toLock: CHARLIE.lock,
          config,
        });
        const hash = await signAndOrSendTransaction({
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
      },
      0,
    );
    it('Create a ClusterProxy with Cluster (via lock proxy)', async () => {
      const clusterRecord = existingClusterRecord ?? popRecord(CLUSTER_OUTPOINT_RECORDS, true);
      const clusterCell = await retryQuery(() => getClusterByOutPoint(clusterRecord.outPoint, config));
      const clusterId = clusterCell.cellOutput.type!.args;

      const { txSkeleton, outputIndex, reference } = await createClusterProxy({
        clusterOutPoint: clusterCell.outPoint!,
        minPayment: 10,
        toLock: clusterRecord.account.lock,
        fromInfos: [clusterRecord.account.address],
        config,
      });

      const clusterProxy = getClusterProxyOutput(txSkeleton, outputIndex, config);
      expect(clusterProxy.cell.cellOutput.lock).toEqual(clusterRecord.account.lock);
      expectTypeId(txSkeleton, outputIndex, clusterProxy.id);
      expect(clusterProxy.data).toEqual(clusterId);
      expect(clusterProxy.args.minPayment).toBeDefined();
      expect(clusterProxy.args.minPayment!.toNumber()).toEqual(10);

      expectTypeCell(txSkeleton, 'output', clusterProxy.cell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterProxy.script.cellDep);

      expect(reference).toBeDefined();
      expect(reference.referenceType).toEqual('lockProxy');
      expectLockCell(txSkeleton, 'both', clusterRecord.account.lock);
      expectCellDep(txSkeleton, {
        outPoint: clusterRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndOrSendTransaction({
        account: clusterRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterRecord = void 0;
        CLUSTER_OUTPOINT_RECORDS.push(clusterRecord);
        CLUSTER_PROXY_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: clusterRecord.account,
        });
      }
    }, 0);
    it('Create a ClusterProxy with Cluster (via cell reference)', async () => {
      const clusterRecord = existingClusterRecord ?? popRecord(CLUSTER_OUTPOINT_RECORDS, true);
      const clusterCell = await retryQuery(() => getClusterByOutPoint(clusterRecord.outPoint, config));
      const clusterId = clusterCell.cellOutput.type!.args;

      expectCellLock(clusterCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterRecord.account.address === CHARLIE.address ? ALICE : CHARLIE;

      const { txSkeleton, outputIndex, reference } = await createClusterProxy({
        clusterOutPoint: clusterCell.outPoint!,
        minPayment: 10,
        toLock: clusterRecord.account.lock,
        fromInfos: [oppositeAccount.address],
        config,
      });

      const clusterProxy = getClusterProxyOutput(txSkeleton, outputIndex, config);
      expect(clusterProxy.cell.cellOutput.lock).toEqual(clusterRecord.account.lock);
      expectTypeId(txSkeleton, outputIndex, clusterProxy.id);
      expect(clusterProxy.data).toEqual(clusterId);
      expect(clusterProxy.args.minPayment).toBeDefined();
      expect(clusterProxy.args.minPayment!.toNumber()).toEqual(10);

      expectTypeCell(txSkeleton, 'output', clusterProxy.cell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterProxy.script.cellDep);

      expect(reference).toBeDefined();
      expect(reference.referenceType).toEqual('cell');
      expect(reference.cluster).toBeDefined();
      expect(reference.cluster).toHaveProperty('inputIndex');
      expect(reference.cluster).toHaveProperty('outputIndex');

      expectTypeCell(txSkeleton, 'both', clusterCell.cellOutput.type!);

      const clusterScript = getSporeScript(config, 'Cluster', clusterCell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndOrSendTransaction({
        account: [clusterRecord.account, oppositeAccount],
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
        CLUSTER_PROXY_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: clusterRecord.account,
        });
      }
    }, 0);
    it('Transfer a ClusterProxy', async () => {
      const clusterProxyRecord = existingClusterProxyRecord ?? popRecord(CLUSTER_PROXY_OUTPOINT_RECORDS, true);
      const clusterProxyCell = await retryQuery(() => getClusterProxyByOutPoint(clusterProxyRecord.outPoint, config));

      expectCellLock(clusterProxyCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterProxyRecord.account.address === CHARLIE.address ? ALICE : CHARLIE;

      const { txSkeleton, outputIndex } = await transferClusterProxy({
        outPoint: clusterProxyCell.outPoint!,
        fromInfos: [clusterProxyRecord.account.address],
        toLock: oppositeAccount.lock,
        config,
      });

      const clusterProxy = getClusterProxyOutput(txSkeleton, outputIndex, config);
      expect(clusterProxy.cell.cellOutput.lock).toEqual(oppositeAccount.lock);
      expect(clusterProxy.args.minPayment).toBeDefined();
      expect(clusterProxy.args.minPayment!.toNumber()).toEqual(10);

      expectTypeCell(txSkeleton, 'both', clusterProxy.cell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterProxy.script.cellDep);

      const witness = txSkeleton.get('witnesses').last();
      expect(witness).toBeDefined();
      const actions = getActionsFromCobuildWitnessLayout(witness!);
      expect(actions[0]).toBeDefined();
      expect(actions[0]).toHaveProperty('sporeActionData');
      expect(actions[0].sporeActionData).toHaveProperty('type', 'TransferClusterProxy');

      const clusterProxyType = clusterProxy.cell.cellOutput.type!;
      const clusterProxyTypeHash = utils.computeScriptHash(clusterProxyType);
      const scriptInfo = createSporeScriptInfoFromTemplate({
        scriptHash: clusterProxyTypeHash,
      });
      const scriptInfoHash = utils.ckbHash(ScriptInfo.pack(scriptInfo));
      expect(actions[0].scriptHash).toEqual(clusterProxyTypeHash);
      expect(actions[0].scriptInfoHash).toEqual(scriptInfoHash);

      const sporeActionData = actions[0].sporeActionData;
      expect(sporeActionData).toHaveProperty('type');
      expect(sporeActionData).toHaveProperty('type', 'TransferClusterProxy');
      expect(sporeActionData).toHaveProperty('value');
      expect(sporeActionData.value).toHaveProperty('clusterId', clusterProxy.data);
      expect(sporeActionData.value).toHaveProperty('clusterProxyId', clusterProxy.id);
      expect(sporeActionData.value).toHaveProperty('from', {
        type: 'Script',
        value: clusterProxyRecord.account.lock,
      });
      expect(sporeActionData.value).toHaveProperty('to', {
        type: 'Script',
        value: clusterProxy.cell.cellOutput.lock,
      });

      const hash = await signAndOrSendTransaction({
        account: clusterProxyRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterProxyRecord = void 0;
        CLUSTER_PROXY_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: oppositeAccount,
        });
      }
    }, 0);
    it('Melt a ClusterProxy', async () => {
      const clusterProxyRecord = existingClusterProxyRecord ?? popRecord(CLUSTER_PROXY_OUTPOINT_RECORDS, true);
      const clusterProxyCell = await retryQuery(() => getClusterProxyByOutPoint(clusterProxyRecord.outPoint, config));
      const clusterProxyType = clusterProxyCell.cellOutput.type;

      const { txSkeleton } = await meltClusterProxy({
        outPoint: clusterProxyCell.outPoint!,
        changeAddress: clusterProxyRecord.account.address,
        config,
      });

      expectTypeCell(txSkeleton, 'input', clusterProxyCell.cellOutput.type!);

      const clusterProxyScript = getSporeScript(config, 'ClusterProxy', clusterProxyType!);
      expectCellDep(txSkeleton, clusterProxyScript.cellDep);

      const hash = await signAndOrSendTransaction({
        account: clusterProxyRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterProxyRecord = void 0;
      }
    }, 0);
  });

  describe('ClusterAgent basics', () => {
    it('Create a ClusterAgent with ClusterProxy (via payment)', async () => {
      const clusterProxyRecord = existingClusterProxyRecord ?? popRecord(CLUSTER_PROXY_OUTPOINT_RECORDS, true);
      const clusterProxyCell = await retryQuery(() => getClusterProxyByOutPoint(clusterProxyRecord.outPoint, config));
      const clusterProxyArgs = unpackToRawClusterProxyArgs(clusterProxyCell.cellOutput.type!.args);
      const minPayment = clusterProxyArgs.minPayment;
      expect(minPayment).toBeDefined();

      expectCellLock(clusterProxyCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterProxyRecord.account.address === CHARLIE.address ? ALICE : CHARLIE;

      const { txSkeleton, outputIndex, reference } = await createClusterAgent({
        clusterProxyOutPoint: clusterProxyRecord.outPoint!,
        referenceType: 'payment',
        toLock: oppositeAccount.lock,
        fromInfos: [oppositeAccount.address],
        config,
      });

      const clusterAgent = getClusterAgentOutput(txSkeleton, outputIndex, config);
      expect(clusterAgent.cell.cellOutput.lock).toEqual(oppositeAccount.lock);
      expect(clusterAgent.cell.cellOutput.type!.args).toEqual(clusterProxyCell.data);
      expect(clusterAgent.data).toEqual(packRawClusterAgentDataToHash(clusterProxyCell.cellOutput.type!));

      expectCellDep(txSkeleton, clusterAgent.script.cellDep);

      expect(reference.referenceType).toEqual('payment');
      expect(reference.payment).toBeDefined();
      expect(reference.payment).toHaveProperty('outputIndex');

      const paymentCell = txSkeleton.get('outputs').get(reference.payment!.outputIndex!);
      expect(paymentCell).toBeDefined();
      expect(paymentCell!.cellOutput.lock).toEqual(clusterProxyCell.cellOutput.lock);

      const minimalPayment = BI.from(minPayment!);
      const lockRequiredCapacity = minimalCellCapacityByLock(clusterProxyCell.cellOutput.lock);
      const expectedPayment = lockRequiredCapacity.gt(minimalPayment) ? lockRequiredCapacity : minimalPayment;
      expect(BI.from(paymentCell!.cellOutput.capacity).gte(expectedPayment)).toEqual(true);

      const clusterProxyScript = getSporeScript(config, 'ClusterProxy', clusterProxyCell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterProxyScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterProxyRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndOrSendTransaction({
        account: oppositeAccount,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterProxyRecord = void 0;
        CLUSTER_PROXY_OUTPOINT_RECORDS.push(clusterProxyRecord);
        CLUSTER_AGENT_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: oppositeAccount,
        });
      }
    }, 0);
    it('Create a ClusterAgent with ClusterProxy (via cell reference)', async () => {
      const clusterProxyRecord = existingClusterProxyRecord ?? popRecord(CLUSTER_PROXY_OUTPOINT_RECORDS, true);
      const clusterProxyCell = await retryQuery(() => getClusterProxyByOutPoint(clusterProxyRecord.outPoint, config));

      expectCellLock(clusterProxyCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterProxyRecord.account.address === CHARLIE.address ? ALICE : CHARLIE;

      const { txSkeleton, outputIndex, reference } = await createClusterAgent({
        clusterProxyOutPoint: clusterProxyRecord.outPoint!,
        referenceType: 'cell',
        toLock: oppositeAccount.lock,
        fromInfos: [clusterProxyRecord.account.address],
        config,
      });

      const clusterAgent = getClusterAgentOutput(txSkeleton, outputIndex, config);
      expect(clusterAgent.cell.cellOutput.lock).toEqual(oppositeAccount.lock);
      expect(clusterAgent.cell.cellOutput.type!.args).toEqual(clusterProxyCell.data);
      expect(clusterAgent.data).toEqual(packRawClusterAgentDataToHash(clusterProxyCell.cellOutput.type!));

      expectCellDep(txSkeleton, clusterAgent.script.cellDep);

      expect(reference.referenceType).toEqual('cell');
      expect(reference.clusterProxy).toBeDefined();
      expect(reference.clusterProxy).toHaveProperty('inputIndex');
      expect(reference.clusterProxy).toHaveProperty('outputIndex');

      expectTypeCell(txSkeleton, 'both', clusterProxyCell.cellOutput.type!);

      const clusterProxyScript = getSporeScript(config, 'ClusterProxy', clusterProxyCell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterProxyScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterProxyRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndOrSendTransaction({
        account: clusterProxyRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterProxyRecord = void 0;
        CLUSTER_PROXY_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(reference.clusterProxy!.outputIndex).toHexString(),
          },
          account: clusterProxyRecord.account,
        });
        CLUSTER_AGENT_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: oppositeAccount,
        });
      }
    }, 0);
    it('Transfer a ClusterAgent', async () => {
      const clusterAgentRecord = existingClusterAgentRecord ?? popRecord(CLUSTER_AGENT_OUTPOINT_RECORDS, true);
      const clusterAgentCell = await retryQuery(() => getClusterAgentByOutPoint(clusterAgentRecord.outPoint, config));

      expectCellLock(clusterAgentCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterAgentRecord.account.address === CHARLIE.address ? ALICE : CHARLIE;

      const { txSkeleton, outputIndex } = await transferClusterAgent({
        outPoint: clusterAgentCell.outPoint!,
        fromInfos: [clusterAgentRecord.account.address],
        toLock: oppositeAccount.lock,
        config,
      });

      const clusterAgent = getClusterAgentOutput(txSkeleton, outputIndex, config);
      expect(clusterAgent.cell.cellOutput.lock).toEqual(oppositeAccount.lock);

      expectTypeCell(txSkeleton, 'both', clusterAgent.cell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterAgent.script.cellDep);

      const hash = await signAndOrSendTransaction({
        account: [clusterAgentRecord.account, oppositeAccount],
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterAgentRecord = void 0;
        CLUSTER_AGENT_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: oppositeAccount,
        });
      }
    }, 0);
    it('Melt a ClusterAgent', async () => {
      const clusterAgentRecord = existingClusterAgentRecord ?? popRecord(CLUSTER_AGENT_OUTPOINT_RECORDS, true);
      const clusterAgentCell = await retryQuery(() => getClusterAgentByOutPoint(clusterAgentRecord.outPoint, config));
      const clusterAgentType = clusterAgentCell.cellOutput.type!;

      const { txSkeleton } = await meltClusterAgent({
        outPoint: clusterAgentCell.outPoint!,
        changeAddress: clusterAgentRecord.account.address,
        config,
      });

      expectTypeCell(txSkeleton, 'input', clusterAgentCell.cellOutput.type!);

      const clusterAgentScript = getSporeScript(config, 'ClusterAgent', clusterAgentType);
      expectCellDep(txSkeleton, clusterAgentScript.cellDep);

      const hash = await signAndOrSendTransaction({
        account: clusterAgentRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterAgentRecord = void 0;
      }
    }, 0);
  });

  describe('Spore with ClusterAgent', () => {
    it('Create a Spore with ClusterAgent (via lock proxy)', async () => {
      const clusterAgentRecord = existingClusterAgentRecord ?? popRecord(CLUSTER_AGENT_OUTPOINT_RECORDS, true);
      const clusterAgentCell = await retryQuery(() => getClusterAgentByOutPoint(clusterAgentRecord.outPoint, config));
      const clusterId = clusterAgentCell.cellOutput.type!.args;

      const { txSkeleton, outputIndex, reference } = await createSpore({
        data: {
          clusterId,
          contentType: 'text/plain',
          content: bytifyRawString('content'),
        },
        clusterAgentOutPoint: clusterAgentCell.outPoint!,
        fromInfos: [clusterAgentRecord.account.address],
        toLock: clusterAgentRecord.account.lock,
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.data.clusterId).toEqual(clusterId);

      expect(reference.referenceTarget).toEqual('clusterAgent');
      expect(reference.referenceType).toEqual('lockProxy');
      expectLockCell(txSkeleton, 'both', clusterAgentCell.cellOutput.lock);

      const clusterScript = getSporeScript(config, 'ClusterAgent', clusterAgentCell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterAgentRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndOrSendTransaction({
        account: clusterAgentRecord.account,
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterAgentRecord = void 0;
        CLUSTER_AGENT_OUTPOINT_RECORDS.push(clusterAgentRecord);
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: clusterAgentRecord.account,
        });
      }
    }, 0);
    it('Create a Spore with ClusterAgent (via cell reference)', async () => {
      const clusterAgentRecord = existingClusterAgentRecord ?? popRecord(CLUSTER_AGENT_OUTPOINT_RECORDS, true);
      const clusterAgentCell = await retryQuery(() => getClusterAgentByOutPoint(clusterAgentRecord.outPoint, config));
      const clusterId = clusterAgentCell.cellOutput.type!.args;

      expectCellLock(clusterAgentCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = clusterAgentRecord.account.address === CHARLIE.address ? ALICE : CHARLIE;

      const { txSkeleton, outputIndex, reference } = await createSpore({
        data: {
          clusterId,
          contentType: 'text/plain',
          content: bytifyRawString('content'),
        },
        clusterAgentOutPoint: clusterAgentCell.outPoint!,
        toLock: clusterAgentRecord.account.lock,
        fromInfos: [oppositeAccount.address],
        config,
      });

      const spore = getSporeOutput(txSkeleton, outputIndex, config);
      expect(spore.data.clusterId).toEqual(clusterId);

      expect(reference.referenceTarget).toEqual('clusterAgent');
      expect(reference.referenceType).toEqual('cell');
      expect(reference.clusterAgent).toBeDefined();
      expect(reference.clusterAgent).toHaveProperty('inputIndex');
      expect(reference.clusterAgent).toHaveProperty('outputIndex');

      const clusterAgentType = clusterAgentCell.cellOutput.type!;
      expectTypeCell(txSkeleton, 'both', clusterAgentType);

      const clusterScript = getSporeScript(config, 'ClusterAgent', clusterAgentType);
      expectCellDep(txSkeleton, clusterScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterAgentRecord.outPoint,
        depType: 'code',
      });

      const hash = await signAndOrSendTransaction({
        account: [oppositeAccount, clusterAgentRecord.account],
        txSkeleton,
        config,
        rpc,
        send: true,
      });
      if (hash) {
        existingClusterAgentRecord = void 0;
        CLUSTER_AGENT_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(reference.clusterAgent!.outputIndex).toHexString(),
          },
          account: clusterAgentRecord.account,
        });
        SPORE_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(outputIndex).toHexString(),
          },
          account: clusterAgentRecord.account,
        });
      }
    }, 0);
  });

  describe.runIf(TEST_VARIABLES.tests.clusterV1)('ClusterAgent with Cluster (v1)', () => {
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

        const hash = await signAndOrSendTransaction({
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
    it('Create a ClusterProxy with Cluster (via lock proxy)', async () => {
      const { cell: clusterCell, account: recordAccount } = await retryQuery(getClusterV1Record);

      expectCellLock(clusterCell, [CHARLIE.lock, ALICE.lock]);

      await expect(() =>
        createClusterProxy({
          clusterOutPoint: clusterCell.outPoint!,
          minPayment: 10,
          toLock: recordAccount.lock,
          fromInfos: [recordAccount.address],
          config,
        }),
      ).rejects.toThrowError('Cannot reference Cluster because target Cluster does not supported lockProxy');
    }, 0);
    it('Create a ClusterProxy with Cluster (via cell reference)', async () => {
      const { cell: clusterCell, account: recordAccount } = await retryQuery(getClusterV1Record);

      expectCellLock(clusterCell, [CHARLIE.lock, ALICE.lock]);
      const oppositeAccount = recordAccount.address === CHARLIE.address ? ALICE : CHARLIE;

      const clusterId = clusterCell.cellOutput.type!.args;

      const { txSkeleton, outputIndex, reference } = await createClusterProxy({
        clusterOutPoint: clusterCell.outPoint!,
        minPayment: 10,
        toLock: recordAccount.lock,
        fromInfos: [oppositeAccount.address],
        config,
      });

      const clusterProxy = getClusterProxyOutput(txSkeleton, outputIndex, config);
      expect(clusterProxy.cell.cellOutput.lock).toEqual(recordAccount.lock);
      expectTypeId(txSkeleton, outputIndex, clusterProxy.id);
      expect(clusterProxy.data).toEqual(clusterId);
      expect(clusterProxy.args.minPayment).toBeDefined();
      expect(clusterProxy.args.minPayment!.toNumber()).toEqual(10);

      expectTypeCell(txSkeleton, 'output', clusterProxy.cell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterProxy.script.cellDep);

      expect(reference).toBeDefined();
      expect(reference.referenceType).toEqual('cell');
      expect(reference.cluster).toBeDefined();
      expect(reference.cluster).toHaveProperty('inputIndex');
      expect(reference.cluster).toHaveProperty('outputIndex');

      expectTypeCell(txSkeleton, 'both', clusterCell.cellOutput.type!);

      const clusterScript = getSporeScript(config, 'Cluster', clusterCell.cellOutput.type!);
      expectCellDep(txSkeleton, clusterScript.cellDep);
      expectCellDep(txSkeleton, {
        outPoint: clusterCell.outPoint!,
        depType: 'code',
      });

      const hash = await signAndOrSendTransaction({
        account: [recordAccount, oppositeAccount],
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
        CLUSTER_OUTPOINT_RECORDS.push({
          outPoint: {
            txHash: hash,
            index: BI.from(reference.cluster!.outputIndex).toHexString(),
          },
          account: recordAccount,
        });
        CLUSTER_PROXY_OUTPOINT_RECORDS.push({
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
