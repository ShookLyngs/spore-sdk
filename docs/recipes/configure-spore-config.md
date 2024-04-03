# Configure Spore SDK with SporeConfig

## What is SporeConfig

To create a spore on-chain, the Spore SDK needs to know the `ScriptId`/`CellDep` of the `SporeType` script.
And when a transaction is ready to be sent on-chain, the Spore SDK needs to know the URL of the target RPC.
Everything required by the Spore SDK is designed to be stored in a SporeConfig, which is a context object that stores/passes information.

A SporeConfig object will have the following properties:

> For the original/detailed type definition of SporeConfig, 
> refer to: [@spore-sdk/core/src/config/types.ts](../../packages/core/src/config/types.ts).

- `lumos`: Config for lumos. Refer to: [@ckb-lumos/config-manager](https://github.com/ckb-js/lumos/tree/develop/packages/config-manager).
- `ckbNodeUrl`: CKB RPC node's URL, will be used when creating lumos/rpc instances. Refer to: [@ckb-lumos/rpc](https://github.com/ckb-js/lumos/tree/develop/packages/rpc).
- `ckbIndexerUrl`: CKB Indexer node's URL, will be used when creating lumos/ckb-indexer instances. Refer to: [@ckb-lumos/ckb-indexer](https://github.com/ckb-js/lumos/tree/develop/packages/ckb-indexer).
- `maxTransactionSize`: Specify the maximum size (in bytes) of single transactions, will be used in variants of APIs to prevent constructing oversize transactions.
- `scripts`: Define necessary script infos, etc. ScriptId, CellDep. For instance, the Spore SDK will use the script infos of Spore and Cluster.
- `extensions`: Define what SporeExtension(s) to be used in the Spore SDK. Note: this part is WIP (working in progress).

## Common usages

### Use the predefined configs

When using the Spore SDK, developers might want to specify a SporeConfig to make actions on a target environment. The Spore SDK provides a `predefinedSporeConfigs` with mainnet/testnet predefined configurations for developers to switch to these environments faster, which contains:

- `Testnet`: A SporeConfig object containing Spore Protocol infos on CKB Testnet.
- `Mainnet`: A SporeConfig object containing Spore Protocol infos on CKB Mainnet.

The Spore SDK uses `predefinedSporeConfigs.Testnet` as the default config.  
But for example, if you want to create a spore on mainnet instead of testnet, specify it like this:

```typescript
import { predefinedSporeConfigs, createSpore } from '@spore-sdk/core';

const result = await createSpore({
  data: {
    contentType: 'image/jpeg',
    content: JPEG_AS_BYTES,
  },
  fromInfos: [WALLET_ADDRESS],
  toLock: WALLET_LOCK,
  config: predefinedSporeConfigs.Lina, // using the mainnet config
});
```

### Set config globally

To use a SporeConfig without passing it everywhere:

```typescript
import { predefinedSporeConfigs, setSporeConfig, createSpore } from '@spore-sdk/core';

// Setting testnet config as the global default
setSporeConfig(predefinedSporeConfigs.Testnet);

// No need to pass the config object in the props
const result = await createSpore({
  data: {
    contentType: 'image/jpeg',
    content: JPEG_AS_BYTES,
  },
  fromInfos: [WALLET_ADDRESS],
  toLock: WALLET_LOCK,
});
```

### Fork a predefined config

When some properties in a predefined SporeConfig is not fit for a developer, the developer can fork the predefined config and create a new one. For example, if a developer can tune down the `maxTransactionSize` number in the testnet's config like this: 

```typescript
import { predefinedSporeConfigs, forkSporeConfig } from '@spore-sdk/core';

// The forked config is a deep clone of the original config 
const newConfig = forkSporeConfig(predefinedSporeConfigs.Testnet, {
  maxTransactionSize: 100,
});

// The two configs has different maxTransactionSize values
console.log(newConfig.maxTransactionSize === predefinedSporeConfigs.Testnet); // false
```


