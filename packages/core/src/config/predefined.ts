import { predefined } from '@ckb-lumos/config-manager';
import { SporeConfig } from './types';

export type PredefinedTestnetSporeScriptName = 'Spore' | 'Cluster' | 'ClusterProxy' | 'ClusterAgent' | 'Mutant' | 'Lua';

const TESTNET_SPORE_CONFIG: SporeConfig<PredefinedTestnetSporeScriptName> = {
  lumos: predefined.AGGRON4,
  ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
  ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  maxTransactionSize: 500 * 1024, // 500 KB
  defaultTags: ['preview'],
  scripts: {
    Spore: {
      versions: [
        // see: https://github.com/dotbitHQ/did-contracts/blob/docs/docs/Deployed-Scripts.md#testnet
        {
          tags: ['v2', 'did'],
          script: {
            codeHash: '0x0b1f412fbae26853ff7d082d422c2bdd9e2ff94ee8aaec11240a5b34cc6e890f',
            hashType: 'type',
          },
          cellDep: {
            outPoint: {
              txHash: '0x29d0123dda05cb92452a46df609e9bd08e066d62f0c3953fe34935dc10edfdcc',
              index: '0x0',
            },
            depType: 'code',
          },
          behaviors: {
            lockProxy: true,
            dynamicCelldep: {
              codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
              hashType: 'type',
              args: '0x80f0d4bf6b3951911aa6b98cc609d477a8a10b903b35cfd528d098e95c36f680',
            },
          },
        },
        {
          tags: ['v2', 'preview'],
          script: {
            codeHash: '0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0d',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x5e8d2a517d50fd4bb4d01737a7952a1f1d35c8afc77240695bb569cd7d9d5a1f',
              index: '0x0',
            },
            depType: 'code',
          },
          behaviors: {
            lockProxy: true,
            cobuild: true,
          },
        },
        {
          tags: ['v1', 'latest'],
          script: {
            codeHash: '0xbbad126377d45f90a8ee120da988a2d7332c78ba8fd679aab478a19d6c133494',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0xfd694382e621f175ddf81ce91ce2ecf8bfc027d53d7d31b8438f7d26fc37fd19',
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
            codeHash: '0x0bbe768b519d8ea7b96d58f1182eb7e6ef96c541fbd9526975077ee09f049058',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0xcebb174d6e300e26074aea2f5dbd7f694bb4fe3de52b6dfe205e54f90164510a',
              index: '0x0',
            },
            depType: 'code',
          },
          behaviors: {
            lockProxy: true,
            cobuild: true,
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
    ClusterProxy: {
      versions: [
        {
          tags: ['v2', 'preview'],
          script: {
            codeHash: '0x4349889bda064adab8f49f7dd8810d217917f7df28e9b2a1df0b74442399670a',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0xc5a41d58155b11ecd87a5a49fdcb6e83bd6684d3b72b2f3686f081945461c156',
              index: '0x0',
            },
            depType: 'code',
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
            codeHash: '0x923e997654b2697ee3f77052cb884e98f28799a4270fd412c3edb8f3987ca622',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x52210232292d10c51b48e72a2cea60d8f0a08c2680a97a8ee7ca0a39379f0036',
              index: '0x0',
            },
            depType: 'code',
          },
          behaviors: {
            lockProxy: true,
            cobuild: true,
          },
        },
      ],
    },
    Mutant: {
      versions: [
        {
          tags: ['v2', 'preview'],
          script: {
            codeHash: '0x5ff1a403458b436ea4b2ceb72f1fa70a6507968493315b646f5302661cb68e57',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x9b2098e5b6f575b2fd34ffd0212bc1c96e1f9e86fcdb146511849c174dfe0d02',
              index: '0x0',
            },
            depType: 'code',
          },
          behaviors: {
            lockProxy: true,
            cobuild: true,
          },
        },
      ],
    },
    Lua: {
      versions: [
        {
          tags: ['v2', 'preview'],
          script: {
            codeHash: '0xed08faee8c29b7a7c29bd9d495b4b93cc207bd70ca93f7b356f39c677e7ab0fc',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x8fb7170a58d631250dabd0f323a833f4ad2cfdd0189f45497e62beb8409e7a0c',
              index: '0x0',
            },
            depType: 'code',
          },
        },
      ],
    },
  },
};

export type PredefinedMainnetSporeScriptName = 'Spore' | 'Cluster';

const MAINNET_SPORE_CONFIG: SporeConfig<PredefinedMainnetSporeScriptName> = {
  lumos: predefined.LINA,
  ckbNodeUrl: 'https://mainnet.ckb.dev/rpc',
  ckbIndexerUrl: 'https://mainnet.ckb.dev/indexer',
  maxTransactionSize: 500 * 1024, // 500 KB
  defaultTags: ['latest'],
  scripts: {
    Spore: {
      versions: [
        // see: https://github.com/dotbitHQ/did-contracts/blob/docs/docs/Deployed-Scripts.md#mainnet
        {
          tags: ['v2', 'did'],
          script: {
            codeHash: '0xcfba73b58b6f30e70caed8a999748781b164ef9a1e218424a6fb55ebf641cb33',
            hashType: 'type',
          },
          cellDep: {
            outPoint: {
              txHash: '0x18dda0f02036305b423b85cce276a40417faed044b2ee9220284215f38734daa',
              index: '0x0',
            },
            depType: 'code',
          },
          behaviors: {
            lockProxy: true,
            dynamicCelldep: {
              codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
              hashType: 'type',
              args: '0x62312cd846659e188b05da11dc3f080b083c27371ea701d6026e11e713e0e3de',
            },
          },
        },
        {
          tags: ['v2', 'latest'],
          script: {
            codeHash: '0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x96b198fb5ddbd1eed57ed667068f1f1e55d07907b4c0dbd38675a69ea1b69824',
              index: '0x0',
            },
            depType: 'code',
          },
          behaviors: {
            lockProxy: true,
            cobuild: true,
          },
        },
      ],
    },
    Cluster: {
      versions: [
        {
          tags: ['v2', 'latest'],
          script: {
            codeHash: '0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0xe464b7fb9311c5e2820e61c99afc615d6b98bdefbe318c34868c010cbd0dc938',
              index: '0x0',
            },
            depType: 'code',
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

export const predefinedSporeConfigs = {
  /**
   * @deprecated Use `Testnet` instead.
   */
  Aggron4: TESTNET_SPORE_CONFIG,
  Testnet: TESTNET_SPORE_CONFIG,
  Mainnet: MAINNET_SPORE_CONFIG,
};
