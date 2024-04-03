import cloneDeep from 'lodash/cloneDeep';
import { describe, expect, it } from 'vitest';
import { TEST_ENV } from './shared';
import {
  SporeConfig,
  getSporeScript,
  forkSporeConfig,
  getSporeConfigHash,
  isSporeScriptCategorySupported,
} from '../config';

describe('SporeConfig', function () {
  const { config } = TEST_ENV;
  it('Hash a SporeConfig', () => {
    const config = cloneDeep(TEST_ENV.config);
    const hash1 = getSporeConfigHash(config);

    config.maxTransactionSize = Math.random() * 1000;
    const hash2 = getSporeConfigHash(config);
    expect(hash1).not.toEqual(hash2);
  });
  it('Fork a SporeConfig', () => {
    const newConfig = forkSporeConfig(config, {
      scripts: {
        Some: {
          versions: [
            {
              tags: ['latest'],
              script: {
                codeHash: '0x00',
                hashType: 'type',
              },
              cellDep: {
                outPoint: {
                  txHash: '0x00',
                  index: '0x',
                },
                depType: 'code',
              },
            },
          ],
        },
      },
    });

    const categoryExistsInOldConfig = isSporeScriptCategorySupported(config, 'Some');
    expect(categoryExistsInOldConfig).eq(false, 'Old SporeConfig should not have "Some" script');

    const categoryExistsInNewConfig = isSporeScriptCategorySupported(newConfig, 'Some');
    expect(categoryExistsInNewConfig).eq(true, 'New SporeConfig should have "Some" script');
  });
  it('Get SporeScript by ScriptId', () => {
    const newConfig = forkSporeConfig(config, {
      scripts: {
        Some: {
          versions: [
            {
              tags: ['v2'],
              script: {
                codeHash: '0x00',
                hashType: 'type',
              },
              cellDep: {
                outPoint: {
                  txHash: '0x00',
                  index: '0x0',
                },
                depType: 'code',
              },
            },
            {
              tags: ['v1'],
              script: {
                codeHash: '0x01',
                hashType: 'type',
              },
              cellDep: {
                outPoint: {
                  txHash: '0x01',
                  index: '0x0',
                },
                depType: 'code',
              },
            },
          ],
        },
      },
    });

    const script = getSporeScript(newConfig, 'Some', {
      codeHash: '0x01',
      hashType: 'type',
    });
    expect(script).toHaveProperty('tags', ['v1']);
    expect(script.script).toHaveProperty('codeHash');
    expect(script.script).toHaveProperty('codeHash', '0x01');
  });
  it('Match tags', () => {
    const cases = [
      {
        tags: ['v2'],
        fullTags: ['v2'],
        result: true,
      },
      {
        tags: ['v2'],
        fullTags: ['v1'],
        result: false,
      },
      {
        tags: ['v2'],
        fullTags: ['v1', 'v2'],
        result: true,
      },
      {
        tags: ['v2'],
        fullTags: ['v1', 'v2', 'v3'],
        result: true,
      },
      {
        tags: ['v2'],
        fullTags: ['v1', 'v3'],
        result: false,
      },
      {
        tags: ['v2', 'preview'],
        fullTags: ['v1', 'v2'],
        result: false,
      },
      {
        tags: ['v2', 'preview'],
        fullTags: ['v1', 'v2', 'v3'],
        result: false,
      },
      {
        tags: ['v2', 'preview'],
        fullTags: ['v1', 'v2', 'preview'],
        result: true,
      },
      {
        tags: ['v2', 'preview'],
        fullTags: ['v1', 'preview', 'v2'],
        result: true,
      },
      {
        tags: ['v2', 'preview'],
        fullTags: ['v1', 'v2', 'preview', 'v3'],
        result: true,
      },
      {
        tags: ['v2', 'preview'],
        fullTags: ['v1', 'v2', 'preview', 'v3', 'v4'],
        result: true,
      },
    ];

    function generateRegex(tags: string[]) {
      const patterns = tags.sort().join(',.*');
      return new RegExp(`${patterns}.*`, 'g');
    }
    function match(tags: string[], patterns: string[]) {
      const regex = generateRegex(patterns);
      return regex.test(tags.sort().join(','));
    }
    for (let i = 0; i < cases.length; i++) {
      const { tags, fullTags, result } = cases[i];
      expect(match(fullTags, tags)).eq(result, `Match case #${i}`);
    }
  });
  it('Get SporeScript by tags', () => {
    const newConfig: SporeConfig = {
      defaultTags: ['latest'],
      lumos: config.lumos,
      ckbNodeUrl: '',
      ckbIndexerUrl: '',
      maxTransactionSize: 1,
      scripts: {
        Spore: {
          versions: [
            {
              tags: ['v2', 'preview'],
              script: {
                codeHash: '0x00',
                hashType: 'data1',
              },
              cellDep: {
                outPoint: {
                  txHash: '0x01',
                  index: '0x0',
                },
                depType: 'code',
              },
            },
            {
              tags: ['v1', 'latest'],
              script: {
                codeHash: '0x02',
                hashType: 'data1',
              },
              cellDep: {
                outPoint: {
                  txHash: '0x03',
                  index: '0x0',
                },
                depType: 'code',
              },
            },
          ],
        },
        Cluster: {
          versions: [
            {
              tags: ['v2', 'preview'],
              script: {
                codeHash: '0x04',
                hashType: 'data1',
              },
              cellDep: {
                outPoint: {
                  txHash: '0x05',
                  index: '0x0',
                },
                depType: 'code',
              },
            },
            {
              tags: ['v1', 'latest'],
              script: {
                codeHash: '0x598d793defef36e2eeba54a9b45130e4ca92822e1d193671f490950c3b856080',
                hashType: 'data1',
              },
              cellDep: {
                outPoint: {
                  txHash: '0x49551a20dfe39231e7db49431d26c9c08ceec96a29024eef3acc936deeb2ca76',
                  index: '0x0',
                },
                depType: 'code',
              },
            },
          ],
        },
      },
    };

    const script = getSporeScript(newConfig, 'Spore', ['v2']);
    expect(script).toBeDefined();
    expect(script!.tags).toBeDefined();
    expect(script!.tags.includes('v2')).toEqual(true);
  });
});
