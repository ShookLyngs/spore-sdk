import { readFileSync } from 'fs';
import { BI } from '@ckb-lumos/lumos';
import { Config } from '@ckb-lumos/config-manager';
import { predefinedSporeConfigs, SporeConfig } from '../../config';

export function generateTestConfig(network: string, configPath?: string): SporeConfig {
  if (network === 'devnet') {
    try {
      const jsonData = JSON.parse(readFileSync(configPath!, 'utf-8'));
      return generateDevnetSporeConfig(jsonData);
    } catch {
      throw new Error(`Cannot generate devnet config from: "${configPath}"`);
    }
  }

  return predefinedSporeConfigs.Aggron4;
}

export function generateDevnetSporeConfig(config: Record<any, any>): SporeConfig {
  return {
    lumos: config as Config,
    ckbNodeUrl: 'http://127.0.0.1:8114',
    ckbIndexerUrl: 'http://127.0.0.1:8114',
    maxTransactionSize: 500 * 1024, // 500 KB
    scripts: {
      Spore: {
        versions: [
          {
            tags: ['v2', 'preview'],
            script: {
              codeHash: config.SCRIPTS.SPORE.CODE_HASH,
              hashType: config.SCRIPTS.SPORE.HASH_TYPE,
            },
            cellDep: {
              outPoint: {
                txHash: config.SCRIPTS.SPORE.TX_HASH,
                index: config.SCRIPTS.SPORE.INDEX,
              },
              depType: config.SCRIPTS.SPORE.DEP_TYPE,
            },
            behaviors: {
              lockProxy: true,
              cobuild: true,
            },
          },
          {
            tags: ['v1', 'latest'],
            script: {
              codeHash: config.SCRIPTS.SPORE_V1.CODE_HASH,
              hashType: config.SCRIPTS.SPORE_V1.HASH_TYPE,
            },
            cellDep: {
              outPoint: {
                txHash: config.SCRIPTS.SPORE_V1.TX_HASH,
                index: config.SCRIPTS.SPORE_V1.INDEX,
              },
              depType: config.SCRIPTS.SPORE_V1.DEP_TYPE,
            },
          },
        ],
      },
      Cluster: {
        versions: [
          {
            tags: ['v2', 'preview'],
            script: {
              codeHash: config.SCRIPTS.CLUSTER.CODE_HASH,
              hashType: config.SCRIPTS.CLUSTER.HASH_TYPE,
            },
            cellDep: {
              outPoint: {
                txHash: config.SCRIPTS.CLUSTER.TX_HASH,
                index: config.SCRIPTS.CLUSTER.INDEX,
              },
              depType: config.SCRIPTS.CLUSTER.DEP_TYPE,
            },
            behaviors: {
              lockProxy: true,
              cobuild: true,
            },
          },
          {
            tags: ['v1', 'latest'],
            script: {
              codeHash: config.SCRIPTS.CLUSTER_V1.CODE_HASH,
              hashType: config.SCRIPTS.CLUSTER_V1.HASH_TYPE,
            },
            cellDep: {
              outPoint: {
                txHash: config.SCRIPTS.CLUSTER_V1.TX_HASH,
                index: config.SCRIPTS.CLUSTER_V1.INDEX,
              },
              depType: config.SCRIPTS.CLUSTER_V1.DEP_TYPE,
            },
            behaviors: {
              clusterDataVersion: 'v1',
            },
          },
        ],
      },
      ClusterProxy: {
        versions: [
          {
            tags: ['v2', 'preview'],
            script: {
              codeHash: config.SCRIPTS.CLUSTER_PROXY.CODE_HASH,
              hashType: config.SCRIPTS.CLUSTER_PROXY.HASH_TYPE,
            },
            cellDep: {
              outPoint: {
                txHash: config.SCRIPTS.CLUSTER_PROXY.TX_HASH,
                index: config.SCRIPTS.CLUSTER_PROXY.INDEX,
              },
              depType: config.SCRIPTS.CLUSTER_PROXY.DEP_TYPE,
            },
            behaviors: {
              lockProxy: true,
              cobuild: true,
            },
          },
        ],
      },
      ClusterAgent: {
        versions: [
          {
            tags: ['v2', 'preview'],
            script: {
              codeHash: config.SCRIPTS.CLUSTER_AGENT.CODE_HASH,
              hashType: config.SCRIPTS.CLUSTER_AGENT.HASH_TYPE,
            },
            cellDep: {
              outPoint: {
                txHash: config.SCRIPTS.CLUSTER_AGENT.TX_HASH,
                index: config.SCRIPTS.CLUSTER_AGENT.INDEX,
              },
              depType: config.SCRIPTS.CLUSTER_AGENT.DEP_TYPE,
            },
            behaviors: {
              lockProxy: true,
              cobuild: true,
            },
          },
        ],
      },
    },
  };
}

export function getEnvVariable(name: string, type: 'number'): number | undefined;
export function getEnvVariable(name: string, type: 'string'): string | undefined;
export function getEnvVariable(name: string, type: 'boolean'): boolean | undefined;
export function getEnvVariable(name: string, type: 'json'): Record<any, any> | undefined;
export function getEnvVariable(name: string, type: 'number', defaultValue: number): number;
export function getEnvVariable(name: string, type: 'string', defaultValue: string): string;
export function getEnvVariable(name: string, type: 'boolean', defaultValue: boolean): boolean;
export function getEnvVariable<T extends Record<any, any>>(name: string, type: 'json', defaultValue: T): T;
export function getEnvVariable(name: string, type: unknown, defaultValue?: unknown): unknown {
  const value = import.meta.env[name];
  if (type === 'json') {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
  if (type === 'boolean') {
    if (value === 'true' || value === 'false') {
      return value === 'true';
    } else {
      return defaultValue;
    }
  }
  if (type === 'number') {
    try {
      return BI.from(value).toNumber();
    } catch {
      return defaultValue;
    }
  }
  if (value && value.trim().length <= 0) {
    return defaultValue;
  }
  if (value === void 0) {
    return defaultValue;
  }

  return value;
}
