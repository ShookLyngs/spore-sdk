# Spore Examples

Here we provide several examples which are minimum viable snippets designed for a Node environment, each showcasing a specific feature implemented using the [Spore SDK](../..).

These examples serve as practical guides for developers, demonstrating how to implement specific features in a straightforward manner, for instance, how to create a spore by a transaction with Spore SDK. And for those who are looking for documentation on how to develop a fully functional application, refer to: [Spore Demos](./demos).

## Scenario examples

### [Creating your first spore](https://docs.spore.pro/tutorials/create-first-spore)

[`spore-first-example`](https://github.com/sporeprotocol/spore-first-example) is a hello world example for Spore SDK, showing you how to upload an image file and create a spore on [Nervos CKB](https://www.nervos.org/) in a split second. This is a well-suited code example for beginners to learn the very basics of Spore Protocol.

- Follow the tutorial at [Creating your first spore](https://docs.spore.pro/tutorials/create-first-spore)
- Run the example on [StackBlitz](https://stackblitz.com/github/sporeprotocol/spore-first-example?file=src%2Findex.ts)
- [GitHub repository](https://github.com/sporeprotocol/spore-first-example)

## Lock script examples

### [CKB Default Lock](../../examples/secp256k1)

[CKB Default Lock](https://github.com/nervosnetwork/ckb-system-scripts/blob/master/c/secp256k1_blake160_sighash_all.c) is the most commonly used lock script on [Nervos CKB](https://www.nervos.org/), also a great starting point for beginners due to its simplicity. You can create private assets with the CKB Default Lock for safeguarding ownership of your private assets.

- [Check CKB Default Lock examples](../../examples/secp256k1)

### [Anyone-can-pay](../../examples/acp)

[Anyone-can-pay](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0026-anyone-can-pay/0026-anyone-can-pay.md) (ACP) lock can be unlocked by anyone without signature verification and accepts any amount of CKB/UDT payment from the unlocker. You can create public clusters with the Anyone-can-pay lock and benefit from charging other users for creating spores within the public cluster.

- [Check ACP examples](../../examples/acp)

### [Omnilock](../../examples/omnilock)

[Omnilock](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0042-omnilock/0042-omnilock.md) is a universal and interoperable lock script supporting various blockchains (Bitcoin, Ethereum, EOS, etc.) verification methods and extensible for future additions. Omnilock also supports a [compatible anyone-can-pay mode](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0042-omnilock/0042-omnilock.md#anyone-can-pay-mode), which allows you to create public clusters using it. You can create private/public spores and clusters with the Omnilock.

- [Check Omnilock examples](../../examples/omnilock)
