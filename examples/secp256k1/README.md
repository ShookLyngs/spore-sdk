# Spore Default Lock Examples

## What is `CKB Default Lock`

[CKB Default Lock](https://github.com/nervosnetwork/ckb-system-scripts/blob/master/c/secp256k1_blake160_sighash_all.c) is the most commonly used lock script on [Nervos CKB](https://www.nervos.org), also a great starting point for beginners due to its simplicity. You can create private assets with the CKB Default Lock for safeguarding ownership of your private assets.

CKB Default Lock is also known as the `Secp256k1Blake160 Sign-all` lock. 

## Featured examples

Spore:
- [apis/createSpore.ts](./apis/createSpore.ts): Create a Spore
- [apis/createSporeWithCluster.ts](./apis/createSporeWithCluster.ts): Create a Clustered Spore with a Cluster
- [apis/createSporeWithClusterAgent.ts](./apis/createSporeWithClusterAgent.ts): Create a Clustered Spore with a ClusterAgent
- [apis/transferSpore.ts](./apis/transferSpore.ts): Transfer a Spore to another account
- [apis/meltSpore.ts](./apis/meltSpore.ts): Melt a Spore and redeem the occupied CKBytes

Cluster:
- [apis/createCluster.ts](./apis/createCluster.ts): Create a Cluster
- [apis/transferCluster.ts](./apis/transferCluster.ts): Transfer a Cluster to another account

ClusterProxy:
- [apis/createClusterProxy.ts](./apis/createClusterProxy.ts): Create a ClusterProxy
- [apis/transferClusterProxy.ts](./apis/transferClusterProxy.ts): Transfer a ClusterProxy to another account
- [apis/meltClusterProxy.ts](./apis/meltClusterProxy.ts): Melt a ClusterProxy and redeem the occupied CKBytes

ClusterAgent:
- [apis/createClusterAgent.ts](./apis/createClusterAgent.ts): Create a ClusterAgent
- [apis/transferClusterAgent.ts](./apis/transferClusterAgent.ts): Transfer a ClusterAgent to another account
- [apis/meltClusterAgent.ts](./apis/meltClusterAgent.ts): Melt a ClusterAgent and redeem the occupied CKBytes

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

Go to the current directory (`examples/secp256k1`) and run an example:

```shell
ts-node apis/createSpore.ts
```

### Review transaction

This example constructs and sends a transaction that creates a spore on-chain. Once the transaction is sent, a `hash` value should be returned. You can later review the transaction on [CKB Explorer](https://pudge.explorer.nervos.org/):

```shell
https://pudge.explorer.nervos.org/transaction/{hash}
```

## Customization

### Update configs

If you have your own testing accounts, or if you want to configure the SporeConfig of the examples, you can go to the [examples/secp256k1/utils/config.ts](./utils/config.ts) file and update it. Inside the `utils/config.ts` file, you can:

- Replace the default testing accounts with your own
- Modify the default SporeConfig as needed

### Use your own accounts

If you want a clean startup environment for testing the functionality of the spore-sdk, you can replace the default testing accounts with your own accounts. Whether locally or in globally, there has two default testing accounts being used, `CHARLIE` and `ALICE`.

How to replace them:

- Replace locally: For replacing the testing accounts locally (only affects the secp256k1 examples), visit the [examples/secp256k1/utils/config.ts](./utils/config.ts) file and edit the `accounts` variable.
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
