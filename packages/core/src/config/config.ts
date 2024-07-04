import cloneDeep from 'lodash/cloneDeep';
import { predefinedSporeConfigs } from './predefined';
import { DynamicScripts, SporeConfig, SporeScriptCategories } from './types';
import { Indexer, Script } from '@ckb-lumos/lumos';

let configStore: SporeConfig = predefinedSporeConfigs.Testnet;

/**
 * Set the global default SporeConfig.
 * The default config is "predefinedSporeConfigs.Aggron4".
 */
export function setSporeConfig<T extends string = string>(config: SporeConfig<T>): void {
  configStore = config;
}

/**
 * Get the global default SporeConfig.
 * The default config is "predefinedSporeConfigs.Aggron4".
 */
export function getSporeConfig<T extends string = string>(): SporeConfig<T> {
  return configStore as SporeConfig<T>;
}

/**
 * Set the global default SporeConfig with dynamic scripts extended.
 * The dynamic scripts will be searched on-chain and be merged into the SporeConfig.
 *
 * @param config
 * @param dynamicConfig
 */
export async function setSporeConfigDynamic<T extends string = string>(
  config: SporeConfig<T>,
  dynamicConfig: DynamicScripts<T>,
): Promise<void> {
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  for (const scriptName in dynamicConfig) {
    const dynamicScript = dynamicConfig[scriptName];
    const typeIdScript: Script = {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: dynamicScript.typeid_args,
    };
    const { objects } = await indexer.getCells({
      script: typeIdScript,
      scriptType: 'type',
      scriptSearchMode: 'exact',
    });
    if (objects.length === 0) {
      throw new Error(`Dynamic script not found: ${scriptName}`);
    }
    const cell = objects[0];
    config.scripts[scriptName].versions.push({
      tags: ['latest', scriptName],
      script: dynamicScript.script,
      cellDep: {
        outPoint: cell.outPoint!,
        depType: 'code',
      },
    });
  }
  configStore = config;
}

/**
 * Clone and create a new SporeConfig.
 */
export function forkSporeConfig<T1 extends string, T2 extends string>(
  origin: SporeConfig<T1>,
  change: Partial<SporeConfig<T2>>,
): SporeConfig<T1 | T2> {
  origin = cloneDeep(origin);

  const scripts = {
    ...origin.scripts,
    ...change.scripts,
  } as SporeScriptCategories<T1 | T2>;

  return {
    ...origin,
    ...change,
    scripts,
  };
}
