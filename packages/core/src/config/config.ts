import cloneDeep from 'lodash/cloneDeep';
import { predefinedSporeConfigs } from './predefined';
import { SporeConfig, SporeScriptCategories } from './types';

let configStore: SporeConfig = predefinedSporeConfigs.Aggron4;

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
