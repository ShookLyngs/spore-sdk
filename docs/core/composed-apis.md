# Composed API

<!-- TOC -->
* [Composed API](#composed-api)
  * [Spore](#spore)
    * [createSpore](#createspore)
      * [Examples](#examples)
    * [transferSpore](#transferspore)
      * [Example](#example)
    * [meltSpore](#meltspore)
      * [Example](#example-1)
  * [Cluster](#cluster)
    * [createCluster](#createcluster)
      * [Examples](#examples-1)
    * [transferCluster](#transfercluster)
      * [Example](#example-2)
  * [ClusterProxy](#clusterproxy)
    * [createClusterProxy](#createclusterproxy)
      * [Example](#example-3)
    * [transferClusterProxy](#transferclusterproxy)
      * [Example](#example-4)
    * [meltClusterProxy](#meltclusterproxy)
      * [Example](#example-5)
  * [ClusterAgent](#clusteragent)
    * [createClusterAgent](#createclusteragent)
      * [Example](#example-6)
    * [transferClusterAgent](#transferclusteragent)
      * [Example](#example-7)
    * [meltClusterAgent](#meltclusteragent)
      * [Example](#example-8)
<!-- TOC -->

## Spore

### createSpore

```typescript
declare function createSpore(props: {
  data: SporeDataProps;
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  cluster?: {
    updateOutput?: (cell: Cell) => Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
  };
  clusterAgentOutPoint?: OutPoint;
  clusterAgent?: {
    updateOutput?: (cell: Cell) => Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
  };
  maxTransactionSize?: number | false;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: {
    referenceTarget: 'cluster' | 'clusterAgent' | 'none';
    referenceType?: 'cell' | 'lockProxy';
    cluster?: {
      inputIndex: number;
      outputIndex: number;
    };
    clusterAgent?: {
      inputIndex: number;
      outputIndex: number;
    };
  };
}>;
```

#### Examples

- [examples/secp256k1/apis/createSpore.ts](../../examples/secp256k1/apis/createSpore.ts)
- [examples/secp256k1/apis/createSporeWithCluster.ts](../../examples/secp256k1/apis/createSporeWithCluster.ts)
- [examples/secp256k1/apis/createSporeWithClusterAgent.ts](../../examples/secp256k1/apis/createSporeWithClusterAgent.ts)
- [examples/acp/apis/createSporeWithAcpCluster.ts](../../examples/acp/apis/createSporeWithAcpCluster.ts)
- [examples/omnilock/acp/createSporeWithAcpCluster.ts](../../examples/omnilock/acp/createSporeWithAcpCluster.ts)

### transferSpore

```typescript
declare function transferSpore(props: {
  outPoint: OutPoint;
  toLock: Script;
  fromInfos?: FromInfo[];
  changeAddress?: Address;
  useCapacityMarginAsFee?: boolean;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}>;
```

#### Example

- [examples/secp256k1/apis/transferSpore.ts](../../examples/secp256k1/apis/transferSpore.ts)

### meltSpore

```typescript
declare function meltSpore(props: {
  outPoint: OutPoint;
  changeAddress?: Address;
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}>;
```

#### Example

- [examples/secp256k1/apis/meltSpore.ts](../../examples/secp256k1/apis/meltSpore.ts)

## Cluster

### createCluster

```typescript
declare function createCluster(props: {
  data: ClusterDataProps;
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  maxTransactionSize?: number | false;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
}>;

interface ClusterDataProps {
  name: string;
  description: string;
}
```

#### Examples

- [examples/secp256k1/apis/createCluster.ts](../../examples/secp256k1/apis/createCluster.ts)
- [examples/acp/apis/createAcpCluster.ts](../../examples/acp/apis/createAcpCluster.ts)
- [examples/omnilock/acp/createAcpCluster.ts](../../examples/omnilock/acp/createAcpCluster.ts)

### transferCluster

```typescript
declare function transferCluster(props: {
  outPoint: OutPoint;
  toLock: Script;
  fromInfos?: FromInfo[];
  changeAddress?: Address;
  useCapacityMarginAsFee?: boolean;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}>;
```

#### Example

- [examples/secp256k1/apis/transferCluster.ts](../../examples/secp256k1/apis/transferCluster.ts)

## ClusterProxy

### createClusterProxy

```typescript
declare function createClusterProxy(props: {
  clusterOutPoint: OutPoint;
  minPayment?: BIish;
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?(cell: Cell): Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  cluster?: {
    updateOutput?(cell: Cell): Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
  };
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: {
    referenceType: 'cell' | 'lockProxy';
    cluster?: {
      inputIndex: number;
      outputIndex: number;
    };
  };
}>;
```

#### Example

- [examples/secp256k1/apis/createClusterProxy.ts](../../examples/secp256k1/apis/createClusterProxy.ts) 

### transferClusterProxy

```typescript
declare function transferClusterProxy(props: {
  outPoint: OutPoint;
  toLock: Script;
  fromInfos?: FromInfo[];
  changeAddress?: Address;
  useCapacityMarginAsFee?: boolean;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}>;
```

#### Example

- [examples/secp256k1/apis/transferClusterProxy.ts](../../examples/secp256k1/apis/transferClusterProxy.ts) 

### meltClusterProxy

```typescript
declare function meltClusterProxy(props: {
  outPoint: OutPoint;
  toLock: Script;
  minPayment?: BIish;
  fromInfos?: FromInfo[];
  changeAddress?: Address;
  useCapacityMarginAsFee?: boolean;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}>;
```

#### Example

- [examples/secp256k1/apis/meltClusterProxy.ts](../../examples/secp256k1/apis/meltClusterProxy.ts) 

## ClusterAgent

### createClusterAgent

```typescript
declare function createClusterAgent(props: {
  clusterProxyOutPoint: OutPoint;
  referenceType: 'cell' | 'payment';
  paymentAmount?: BIish | ((minPayment: BI) => BIish);
  toLock: Script;
  fromInfos: FromInfo[];
  changeAddress?: Address;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  clusterProxy?: {
    updateOutput?: (cell: Cell) => Cell;
    capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
    updateWitness?: HexString | ((witness: HexString) => HexString);
  };
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: {
    referenceType: 'cell' | 'payment';
    clusterProxy?: {
      inputIndex: number;
      outputIndex: number;
    };
    payment?: {
      outputIndex: number;
    };
  };
}>;
```

#### Example

- [examples/secp256k1/apis/createClusterAgent.ts](../../examples/secp256k1/apis/createClusterAgent.ts)

### transferClusterAgent

```typescript
declare function transferClusterAgent(props: {
  outPoint: OutPoint;
  toLock: Script;
  fromInfos?: FromInfo[];
  changeAddress?: Address;
  useCapacityMarginAsFee?: boolean;
  updateOutput?: (cell: Cell) => Cell;
  capacityMargin?: BIish | ((cell: Cell, margin: BI) => BIish);
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
  since?: PackedSince;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}>;
```

#### Example

- [examples/secp256k1/apis/transferClusterAgent.ts](../../examples/secp256k1/apis/transferClusterAgent.ts)

### meltClusterAgent

```typescript
declare function meltClusterAgent(props: {
  outPoint: OutPoint;
  changeAddress?: Address;
  updateWitness?: HexString | ((witness: HexString) => HexString);
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
}>;
```

#### Example

- [examples/secp256k1/apis/meltClusterAgent.ts](../../examples/secp256k1/apis/meltClusterAgent.ts) 
