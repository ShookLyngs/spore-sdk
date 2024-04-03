import { Hash, utils } from '@ckb-lumos/base';
import { bytifyRawString } from '../helpers';
import { SporeConfig } from './types';

const configHashStore: Map<string, Hash> = new Map();

/**
 * Get the hash of a SporeConfig, calculated by the JSON string of the config.
 * Generated hashes will be stored in cache to save time for later searching.
 */
export function getSporeConfigHash(config: SporeConfig): Hash {
  const string = JSON.stringify(config, null, 0);
  if (configHashStore.has(string)) {
    return configHashStore.get(string)!;
  }

  const hash = utils.ckbHash(bytifyRawString(string));
  configHashStore.set(string, hash);
  return hash;
}
