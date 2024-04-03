import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { retryWork } from '../../helpers';
import { meltClusterAgent, meltClusterProxy, meltSpore } from '../../api';
import { getClusterAgentByOutPoint, getClusterProxyByOutPoint, getSporeByOutPoint } from '../../api';
import { retryQuery, signAndSendTransaction, OutPointRecord } from '../helpers';
import { TEST_ENV } from './env';

export const SPORE_OUTPOINT_RECORDS: OutPointRecord[] = [];
export const CLUSTER_OUTPOINT_RECORDS: OutPointRecord[] = [];
export const CLUSTER_PROXY_OUTPOINT_RECORDS: OutPointRecord[] = [];
export const CLUSTER_AGENT_OUTPOINT_RECORDS: OutPointRecord[] = [];

export async function cleanupRecords(props: { name: string }) {
  const [sporeCleanupResults, clusterProxyCleanupResults, clusterAgentCleanupResults] = await Promise.all([
    cleanupSporeRecords(),
    cleanupClusterProxyRecords(),
    cleanupClusterAgentRecords(),
  ]);

  const result = {
    sporeCleanupResults,
    clusterProxyCleanupResults,
    clusterAgentCleanupResults,
  };

  const path = resolve(__dirname, '../tmp');
  if (!existsSync(path)) {
    mkdirSync(path);
  }

  const json = JSON.stringify(result, null, 2);
  writeFileSync(resolve(path, `${props.name}-cleanup-${Date.now()}.json`), json);
}

const { config, rpc } = TEST_ENV;

export async function cleanupSporeRecords() {
  const promises = SPORE_OUTPOINT_RECORDS.map((record) => {
    return retryWork({
      getter: async () => {
        const sporeCell = await retryQuery(() => getSporeByOutPoint(record.outPoint, config));
        const { txSkeleton } = await meltSpore({
          outPoint: sporeCell.outPoint!,
          changeAddress: record.account.address,
          config,
        });

        return signAndSendTransaction({
          account: record.account,
          txSkeleton,
          config,
          rpc,
          send: true,
        });
      },
      retry: 2,
      interval: 5000,
    });
  });
  const works = await Promise.all(promises);
  return SPORE_OUTPOINT_RECORDS.map((record, index) => {
    const work = works[index];
    return {
      success: work.success,
      outPoint: record.outPoint,
      txHash: work.success ? work.result : void 0,
    };
  });
}

export async function cleanupClusterProxyRecords() {
  const promises = CLUSTER_PROXY_OUTPOINT_RECORDS.map((record) => {
    return retryWork({
      getter: async () => {
        const clusterProxyCell = await retryQuery(() => getClusterProxyByOutPoint(record.outPoint, config));
        const { txSkeleton } = await meltClusterProxy({
          outPoint: clusterProxyCell.outPoint!,
          changeAddress: record.account.address,
          config,
        });

        return signAndSendTransaction({
          account: record.account,
          txSkeleton,
          config,
          rpc,
          send: true,
        });
      },
      retry: 2,
      interval: 5000,
    });
  });
  const works = await Promise.all(promises);
  return CLUSTER_PROXY_OUTPOINT_RECORDS.map((record, index) => {
    const work = works[index];
    return {
      success: work.success,
      outPoint: record.outPoint,
      txHash: work.success ? work.result : void 0,
    };
  });
}

export async function cleanupClusterAgentRecords() {
  const promises = CLUSTER_AGENT_OUTPOINT_RECORDS.map((record) => {
    return retryWork({
      getter: async () => {
        const clusterAgentCell = await retryQuery(() => getClusterAgentByOutPoint(record.outPoint, config));
        const { txSkeleton } = await meltClusterAgent({
          outPoint: clusterAgentCell.outPoint!,
          changeAddress: record.account.address,
          config,
        });

        return signAndSendTransaction({
          account: record.account,
          txSkeleton,
          config,
          rpc,
          send: true,
        });
      },
      retry: 2,
      interval: 5000,
    });
  });
  const works = await Promise.all(promises);
  return CLUSTER_AGENT_OUTPOINT_RECORDS.map((record, index) => {
    const work = works[index];
    return {
      success: work.success,
      outPoint: record.outPoint,
      txHash: work.success ? work.result : void 0,
    };
  });
}
