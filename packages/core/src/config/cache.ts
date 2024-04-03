import cloneDeep from 'lodash/cloneDeep';
import { Hash } from '@ckb-lumos/base';
import { getSporeConfigHash } from './hash';
import { SporeConfig, SporeScript } from './types';

const cacheStore: Map<Hash, SporeConfigCache> = new Map();

export interface SporeConfigCache<T extends string = string> {
  hash: Hash;
  config: SporeConfig<T>;
  scriptsByCodeHash: Record<Hash, SporeCategorizedScript>;
  scriptsByTag: Record<T, Record<string, SporeCategorizedScript[]>>;
  scriptsByTags: Record<T, Record<string, SporeCategorizedScript[]>>;
  queryRecordsByTags: Record<T, Record<string, SporeCategorizedScript[]>>;
}

export interface SporeCategorizedScript extends SporeScript {
  name: string;
}

/**
 * Create a SporeCache from SporeConfig and store in cache.
 */
export function setSporeConfigCache<T extends string>(config: SporeConfig<T>): void {
  const cache = createSporeConfigCache<T>(config);
  cacheStore.set(cache.hash, cache);
}

/**
 * Get a SporeConfig's corresponding SporeCache.
 * If not exists, create one and store in cache, and then return the new SporeCache.
 */
export function getSporeConfigCache<T extends string>(config: SporeConfig<T>): SporeConfigCache<T> {
  const hash = getSporeConfigHash(config);
  if (cacheStore.has(hash)) {
    return cacheStore.get(hash) as SporeConfigCache<T>;
  }

  setSporeConfigCache(config);
  return cacheStore.get(hash) as SporeConfigCache<T>;
}

/**
 * Create a SporeConfigCache from SporeConfig.
 * Will generate mapping info for the scripts to save time when searching.
 */
export function createSporeConfigCache<T extends string>(config: SporeConfig<T>): SporeConfigCache<T> {
  const hash = getSporeConfigHash(config);

  const scriptsByCodeHash = {} as Record<Hash, SporeCategorizedScript>;
  const scriptsByTag = {} as Record<T, Record<string, SporeCategorizedScript[]>>;
  const scriptsByTags = {} as Record<T, Record<string, SporeCategorizedScript[]>>;
  const queryRecordsByTags = {} as Record<T, Record<string, SporeCategorizedScript[]>>;

  for (const scriptName in config.scripts) {
    const scriptCategory = config.scripts[scriptName];
    const scriptTagMap = {} as Record<string, SporeCategorizedScript[]>;
    const scriptTagsMap = {} as Record<string, SporeCategorizedScript[]>;

    for (const script of scriptCategory.versions) {
      const categorizedScript: SporeCategorizedScript = {
        name: scriptName,
        ...cloneDeep(script),
      };
      scriptsByCodeHash[script.script.codeHash] = categorizedScript;
      const tags = script.tags.sort();
      for (const tag of tags) {
        if (scriptTagMap[tag] === void 0) {
          scriptTagMap[tag] = [];
        }
        scriptTagMap[tag].push(categorizedScript);
      }
      const combinedTags = tags.join(',');
      if (!scriptTagsMap[combinedTags]) {
        scriptTagsMap[combinedTags] = [];
      }
      scriptTagsMap[combinedTags].push(categorizedScript);
    }

    scriptsByTag[scriptName] = scriptTagMap;
    scriptsByTags[scriptName] = scriptTagsMap;
    queryRecordsByTags[scriptName] = {};
  }

  return {
    hash,
    config,
    scriptsByTag,
    scriptsByTags,
    scriptsByCodeHash,
    queryRecordsByTags,
  };
}

/**
 * Search for a specific list of SporeScripts by "scriptName" and "tag" in a SporeConfigCache.
 */
export function getSporeCacheScriptsByTag<T extends string>(
  cache: SporeConfigCache<T>,
  scriptName: T,
  tag: string,
): SporeCategorizedScript[] | undefined {
  const scripts = cache.scriptsByTag[scriptName]?.[tag];
  if (!Array.isArray(scripts)) {
    return void 0;
  }

  return scripts;
}

/**
 * Search SporeConfig by "scriptName" and "tags" in a SporeConfigCache.
 */
export function getSporeCacheScriptsByTags<T extends string>(
  cache: SporeConfigCache<T>,
  scriptName: T,
  tags: string[],
): SporeCategorizedScript[] | undefined {
  if (tags.length === 1) {
    return getSporeCacheScriptsByTag(cache, scriptName, tags[0]);
  }

  const recordsMap: Record<string, SporeCategorizedScript[]> = cache.queryRecordsByTags[scriptName];
  const sortedTags = tags.sort();
  const key = sortedTags.join(',');
  if (recordsMap && key in recordsMap) {
    return recordsMap[key];
  }

  const scriptsMap = cache.scriptsByTags[scriptName];
  if (!scriptsMap) {
    return void 0;
  }

  const patterns = sortedTags.join(',.*');
  const regex = new RegExp(`${patterns}.*`, 'g');
  const match = Object.entries(scriptsMap).filter(([_tags]) => {
    return regex.test(_tags);
  });
  if (match) {
    const matchScripts = match.reduce((matches, [_, scripts]) => {
      matches.push(...scripts);
      return matches;
    }, [] as SporeCategorizedScript[]);
    recordsMap[key] = matchScripts;
    return matchScripts;
  }

  return void 0;
}

/**
 * Search for a specific SporeScript by "codeHash" in a SporeCache.
 * If "scriptName" is passed, it also checks whether the name of the target script matches.
 */
export function getSporeCacheScriptByCodeHash<T extends string>(
  cache: SporeConfigCache<T>,
  codeHash: Hash,
  scriptName?: T,
) {
  const script = cache.scriptsByCodeHash[codeHash];
  if (scriptName && script.name !== scriptName) {
    return void 0;
  }

  return script;
}
