
# Construct transactions with Spore SDK

## The Spore SDK

As an SDK designed to interact with the Spore Protocol, the primary mission of the Spore SDK is to provide developers with everything necessary to engage with the spores/clusters on-chain. 

Key functionalities of the Spore SDK:

1. Construct spores/clusters transactions
2. Encode and decode the cell data of spores/clusters
3. Simplify application and service development with helpful utilities

So, let's start by peeling off a corner of the Spore SDK. 
The following instructions will focus on the first functionality, demonstrating how to create a spore on-chain using Spore SDK by constructing a transaction.

## Create a transaction

Take the [@spore-examples/secp256k1](../../examples/secp256k1/apis/createSpore.ts) as an example to understand how to create an on-chain spore using `@spore-sdk/core`. The transaction process involves the following steps:

1. Construct a transaction by filling in the inputs and outputs
2. Sign the transaction using a connected wallet
3. Send the transaction via RPC

The SDK's responsibility is to handle the first step to construct a transaction. As a developer, you are expected to complete the remaining steps. With that said, let's see how to construct a transaction for creating a spore on-chain:

```typescript
import { createSpore, SporeConfig } from '@spore-sdk/core';

const createSporeResult = await createSpore({
  data: {
    contentType: 'image/jpeg',
    content: JPEG_AS_BYTES,
  },
  fromInfos: [WALLET_ADDRESS],
  toLock: WALLET_LOCK,
});
```

The above `createSpore` function constructs a TransactionSkeleton with inputs and outputs, along with filled placeholders for witnesses. The entire process can be briefly summarized as follows:

1. Create an empty TransactionSkeleton
2. Create a spore and add it to TransactionSkeleton.outputs
3. Collect CKBytes from `WALLET_ADDRESS` to TransactionSkeleton.inputs
4. Fill each input's corresponding witness with a placeholder (if necessary)
5. Add related cell deps to TransactionSkeleton.cellDeps
6. Update the spore and generate an ID for it

As a result, a `createSporeResult` object is returned, which contains:

- `txSkeleton`: A [TransactionSkeleton](https://github.com/ckb-js/lumos/blob/develop/packages/helpers/src/index.ts#L314-L339) is an immutable object representing the context of an unfinished transaction. You can continue updating its content until it is ready to be sent via RPC.
- `outputIndex`: The new spore's output index in the TransactionSkeleton.
- `cluster`: An object that specifies the input/output index of the new spore's dependent cluster in the TransactionSkeleton, if the latter exists.

The SDK's responsibility ends here. However, the TransactionSkeleton still needs to be signed before it can be sent via RPC.

## Sign a transaction

By signing a transaction, you provide ownership verification for all cells (inputs/outputs) that require it. In the case of the `createSpore` function, it typically only needs to validate the collected input cells associated with the `WALLET_ADDRESS`, as discussed earlier.

> For instructions on how to sign a transaction, refer to: [How to sign transaction](https://github.com/nervosnetwork/ckb-system-scripts/wiki/How-to-sign-transaction).

> For code example of signing Secp256k1Blake160 inputs, refer to: [examples/secp256k1/utils/wallet.ts](../../examples/secp256k1/utils/wallet.ts).

## Send a transaction

A signed TransactionSkeleton is considered complete.
Now, let's convert the TransactionSkeleton into a Transaction and send it via RPC.

```typescript
import { predefinedSporeConfigs } from '@spore-sdk/core';
import { helpers, RPC } from '@ckb-lumos/lumos';

// Get testnet config
const config = predefinedSporeConfigs.Testnet;

// Convert TransactionSkeleton to Transaction
const tx = helpers.createTransactionFromSkeleton(txSkeleton);

// Send the transaction
const rpc = new RPC(config.ckbNodeUrl);
const hash = await rpc.sendTransaction(tx, 'passthrough');
```

The `hash` variable at the end of the above code block is the outcome of the entire process. It represents the `Transaction Hash` of the transaction just sent. You can utilize this hash to query and review the transaction details.

Copy the `hash` and visit the [CKB Explorer (Testnet)](https://pudge.explorer.nervos.org/) website to search for the transaction. In the transaction's details, you should find a cell in the outputs representing the spore you just created on-chain.

> Additionally, if you want to decode the spores' data and verify its accuracy, you can copy the cell's data and follow the recipe provided to decode it: [Handle spore/cluster data](./handle-cell-data.md).
