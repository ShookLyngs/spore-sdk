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
        {
          tags: ['v2', 'preview'],
          script: {
            codeHash: '0x5e063b4c0e7abeaa6a428df3b693521a3050934cf3b0ae97a800d1bc31449398',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x06995b9fc19461a2bf9933e57b69af47a20bf0a5bc6c0ffcb85567a2c733f0a1',
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
            codeHash: '0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0xfbceb70b2e683ef3a97865bb88e082e3e5366ee195a9c826e3c07d1026792fcd',
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
            codeHash: '0xbe8b9ce3d05a32c4bb26fe71cd5fc1407ce91e3a8b9e8719be2ab072cef1454b',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x0231ea581bbc38965e10a2659da326ae840c038a9d0d6849f458b51d94870104',
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
            codeHash: '0xc986099b41d79ca1b2a56ce5874bcda8175440a17298ea5e2bbc3897736b8c21',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x53fdb9366637434ff685d0aca5e2a68a859b6fcaa4b608a7ecca0713fed0f5b7',
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
            codeHash: '0x94a9b875911ace20f1f0d063a26495d14e4b04e32fd218261bb747f34e71ae47',
            hashType: 'data1',
          },
          cellDep: {
            outPoint: {
              txHash: '0x3faf49cbd18fc99566079b534c3c05b2b29703d936e9c0b04234bcc686e076b1',
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
