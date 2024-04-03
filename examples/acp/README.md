# Spore ACP Examples

## What is `Anyone-can-pay` lock

[Anyone-can-pay](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0026-anyone-can-pay/0026-anyone-can-pay.md) (ACP) lock is designed to be unlocked by anyone without signature verification and accepts any amount of CKB/UDT payment from the unlocker.
You can create public Clusters with the Anyone-can-pay lock and benefit from charging other users for creating Spores that references the public Clusters.

Refer to the RFC for more detailed rules: [CKB RFC 0026: Anyone-can-pay Lock](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0026-anyone-can-pay/0026-anyone-can-pay.md#script-structure).

## Featured examples

- [apis/createAcpCluster.ts](./apis/createAcpCluster.ts): Create a public Cluster that can be referenced by any Spore
- [apis/createSporeWithAcpCluster.ts](./apis/createSporeWithAcpCluster.ts): Create a private Spore that references a public Cluster

## Run examples

> Please make sure you've met the pre-requirements:  
> [`Node.js`](https://nodejs.org/) >= 18.0.0  
> [`PNPM`](https://pnpm.io/) >= 8.0.0  

### Setup environment

To set up the local environment, run the following command at the root of the Spore SDK:

```shell
pnpm i && pnpm run build:packages
```

### Run an example

Go to the current directory (`examples/acp`) and run an example:

```shell
ts-node apis/createAcpCluster.ts
```

### Review transaction

This example constructs and sends a transaction that creates a spore on-chain. Once the transaction is sent, a `hash` value should be returned. You can later review the transaction on [CKB Explorer](https://pudge.explorer.nervos.org/):

```shell
https://pudge.explorer.nervos.org/transaction/{hash}
```

## Customization

### Update configs

If you have your own testing accounts, or if you want to configure the SporeConfig of the examples, you can go to the [examples/acp/utils/config.ts](./utils/config.ts) file and update it. Inside the `utils/config.ts` file, you can:

- Replace the default testing accounts with your own
- Modify the default SporeConfig as needed

### Use your own accounts

If you want a clean startup environment for testing the functionality of the Spore SDK, you can replace the default testing accounts with your own accounts. Whether locally or in globally, there has two default testing accounts being used, `CHARLIE` and `ALICE`.

How to replace them:

- Replace locally: For replacing the testing accounts locally (only affects the secp256k1 examples), visit the [examples/acp/utils/config.ts](./utils/config.ts) file and edit the `accounts` variable.
- Replace globally: If you want to replace the testing accounts globally (affects all kinds of examples), you can visit the [examples/shared/index.ts](../shared/index.ts) file and edit the `accounts` variable.

### Generate testing accounts

For those who want to create new accounts for testing the examples, you can follow the steps below to create a new private key and claim some faucet CKBytes.

**1. Generate a new account:** 

1. Open the [Generator Tool](https://ckb.tools/generator) website
2. Click the refresh icon (🔄) on the page to generate a new account
3. Copy the new account's `Private Key (256-bit)` from the `Private/Public Key` block
4. Replace any of the default testing accounts with the new account

**2. Claim faucet CKBytes for the new account:**

1. Copy the new account's `Nervos CKB Address` from the `Default Lock (Secp256k1-Blake160) - Testnet` block
2. Open the [Nervos Faucet](https://faucet.nervos.org/) website
3. Paste the address into the address input, and click the `Claim` button
4. Wait for a while until the faucet process is completed
