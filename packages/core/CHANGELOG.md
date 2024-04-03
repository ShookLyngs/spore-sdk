# @spore-sdk/core

## 0.2.0-beta.3

### Patch Changes

- a605f5f: Fix duplicated capacity collection in the "createSpore" API
- 858c8fb: slipt co-build generation interfaces to export pure assembly functions

## 0.2.0-beta.2

### Patch Changes

- 8a42d58: Add predefined SporeConfig for Mainnet
- 16dfe4f: BREAKING CHANGE: Replaced v2 contracts with a v1-compatible preview version
- 216d357: Support selecting v1/v2 version when creating clusters

## 0.2.0-beta.1

### Patch Changes

- 22d062d: BREAKING CHANGE: Replaced v2 preview contracts

## 0.2.0-beta.0

### Minor Changes

- b89681c: Support basic Cobuild feature with legacy locks

### Patch Changes

- 68e7ed8: Support finding SporeScripts by predefined tags
- aa1895f: Remove minPayment prop from the transferClusterProxy API

## 0.1.1-beta.0

### Patch Changes

- 8801116: Fix typo of the "assertTransactionSkeletonSize" API
- 17fb34c: Support Mutant related features
- 347c225: Fix spore/cluster query logic, should validate target id before querying
- 7c9ee66: Support ClusterProxy and ClusterAgent type cells
- 7e64429: Remove "fromInfos" prop from the "meltSpore" API
- 3b06bcb: Add multipart content support
- c025b67: Add new spore type script version to support more contract features
- e807c5a: Fix and optimize the logic of capacity collection
- 2db9424: Support lock proxy in spore creation

## 0.1.0

### Minor Changes

- d7a42ca: Implementation and docs/examples of Spore Protocol V1

### Patch Changes

- 48a6506: Add Omnilock (ACP) and ACP related examples to show developers how to work with the public clusters
- d9e71ee: Remove esm build in sdk
- e88b8e3: Add recipe doc about how to use SporeConfig
- f352469: Update the script info of cluster/spore
- 24facd1: Fix sdk to build esm and cjs together
- bc37376: Rename term from "destroy" to "melt", etc. "meltSpore"
- 1a30c54: Adds a backup in codec tests
- bd7bfe8: Rename SporeData.cluster to SporeData.clusterId
- f9d2e61: Fix the utf-8 encoding issue, originally the lumos `bytes.bytifyRawString` method can only handle ascii strings
- ca1d6ae: Support capacity margin features in Composed APIs
- d382b0d: Support SporeScript with versions
- db8f7d0: Fix a turbo cache bug, now should clear turbo cache before releasing packages
- e509567: Add capacity margin and input witness relevant props to improve controllability of cells in the APIs
- 9a10284: Update the testnet predefined scripts
- 8a35bd3: Add transaction max size limit to createSpore/createCluster APIs
- 64f8dcd: Simplify api prop names, for example from "sporeData" to "data"
- e41e791: Fix wrong molecule used in transaction size calculation
- 9fce0be: Provide global SporeConfig apis, allow SporeConfig in composed apis to be optional
- 9f1d792: Rename Joint APIs, from "getXCellByY" to "getXByY", and from "injectXIds" to "injectNewXIds"

## 0.1.0-beta.14

### Patch Changes

- db8f7d0: Fix a turbo cache bug, now should clear turbo cache before releasing packages

## 0.1.0-beta.13

### Patch Changes

- bc37376: Rename term from "destroy" to "melt", etc. "meltSpore"
- 9f1d792: Rename Joint APIs, from "getXCellByY" to "getXByY", and from "injectXIds" to "injectNewXIds"

## 0.1.0-beta.12

### Patch Changes

- f9d2e61: Fix the utf-8 encoding issue, originally the lumos `bytes.bytifyRawString` method can only handle ascii strings

## 0.1.0-beta.11

### Patch Changes

- e41e791: Fix wrong molecule used in transaction size calculation

## 0.1.0-beta.10

### Patch Changes

- 48a6506: Add Omnilock (ACP) and ACP related examples to show developers how to work with the public clusters
- e88b8e3: Add recipe doc about how to use SporeConfig
- e509567: Add capacity margin and input witness relevant props to improve controllability of cells in the APIs
- 8a35bd3: Add transaction max size limit to createSpore/createCluster APIs

## 0.1.0-beta.9

### Patch Changes

- ca1d6ae: Support capacity margin features in Composed APIs

## 0.1.0-beta.8

### Patch Changes

- 9a10284: Update the testnet predefined scripts

## 0.1.0-beta.7

### Patch Changes

- d382b0d: Support SporeScript with versions

## 0.1.0-beta.6

### Patch Changes

- 64f8dcd: Simplify api prop names, for example from "sporeData" to "data"
- 9fce0be: Provide global SporeConfig apis, allow SporeConfig in composed apis to be optional

## 0.1.0-beta.5

### Patch Changes

- d9e71ee: Remove esm build in sdk

## 0.1.0-beta.4

### Patch Changes

- f352469: Update the script info of cluster/spore

## 0.1.0-beta.3

### Patch Changes

- 1a30c54: Adds a backup in codec tests

## 0.1.0-beta.2

### Patch Changes

- bd7bfe8: Rename SporeData.cluster to SporeData.clusterId

## 0.1.0-beta.1

### Patch Changes

- Fix sdk to build esm and cjs together

## 0.1.0-beta.0

### Minor Changes

- Implementation and docs/examples of Spore Protocol V1
