import { BIish } from '@ckb-lumos/bi';
import { Address, Script } from '@ckb-lumos/base';
import { FromInfo, parseFromInfo } from '@ckb-lumos/lumos/common-scripts';
import { BI, Indexer, helpers, Cell, HexString, OutPoint } from '@ckb-lumos/lumos';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import {
  assertTransactionSkeletonSize,
  createCapacitySnapshotFromTransactionSkeleton,
  injectCapacityAndPayFee,
  returnExceededCapacityAndPayFee,
  setupCell,
} from '../../../helpers';
import { injectNewSporeOutput, injectNewSporeIds, SporeDataProps, getClusterAgentByOutPoint } from '../..';
import { generateCreateSporeAction } from '../../../cobuild/action/spore/createSpore';
import { injectCommonCobuildProof } from '../../../cobuild/base/witnessLayout';
import { encodeToAddress } from '@ckb-lumos/lumos/helpers';
import _ from 'lodash';

export async function createSpore(props: {
  data: SporeDataProps;
  toLock: Script;
  fromInfos: FromInfo[];
  prefixInputs?: Cell[];
  prefixOutputs?: Cell[];
  updateWitness?: HexString | ((witness: HexString) => HexString);
  defaultWitness?: HexString;
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
  mutant?: {
    paymentAmount?: (minPayment: BI, lock: Script, cell: Cell) => BIish;
  };
  skipCheckContentType?: boolean;
  maxTransactionSize?: number | false;
  feeRate?: BIish | undefined;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndex: number;
  reference: Awaited<ReturnType<typeof injectNewSporeOutput>>['reference'];
  mutantReference: Awaited<ReturnType<typeof injectNewSporeOutput>>['mutantReference'];
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  const capacityMargin = BI.from(props.capacityMargin ?? 1_0000_0000);
  const maxTransactionSize = props.maxTransactionSize ?? config.maxTransactionSize ?? false;

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Insert input cells in advance for particular purpose
  if (props.prefixInputs) {
    for (const cell of props.prefixInputs!) {
      const address = encodeToAddress(cell.cellOutput.lock, { config: config.lumos });
      const customScript = {
        script: cell.cellOutput.lock,
      };
      const customScriptExists = props.fromInfos.some((fromInfo) => {
        const parsedInfo = parseFromInfo(fromInfo, { config: config.lumos });
        return _.isEqual(customScript, parsedInfo.fromScript);
      });
      if (!customScriptExists) {
        props.fromInfos.push(address);
      }
      const setupCellResult = await setupCell({
        txSkeleton,
        input: cell,
        updateWitness: props.updateWitness,
        defaultWitness: props.defaultWitness,
        config: config.lumos,
      });
      txSkeleton = setupCellResult.txSkeleton;
    }
  }

  // Insert output cells in advance for particular purpose
  if (props.prefixOutputs) {
    txSkeleton.update('outputs', (outputs) => {
      props.prefixOutputs!.forEach((cell) => outputs.push(cell));
      return outputs;
    });
  }

  // If referencing a ClusterAgent, get it from the OutPoint
  let clusterAgentCell: Cell | undefined;
  if (props.clusterAgentOutPoint) {
    clusterAgentCell = await getClusterAgentByOutPoint(props.clusterAgentOutPoint, config);
  }

  // Create and inject a new spore cell, also inject cluster if exists
  const injectNewSporeResult = await injectNewSporeOutput({
    txSkeleton,
    data: props.data,
    toLock: props.toLock,
    fromInfos: props.fromInfos,
    extraOutputLocks: props.prefixOutputs?.map((cell) => cell.cellOutput.lock),
    changeAddress: props.changeAddress,
    updateOutput: props.updateOutput,
    clusterAgent: props.clusterAgent,
    cluster: props.cluster,
    mutant: props.mutant,
    skipCheckContentType: props.skipCheckContentType,
    clusterAgentCell,
    capacityMargin,
    config,
  });
  txSkeleton = injectNewSporeResult.txSkeleton;

  const snapshot = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);
  if (snapshot.inputsCapacity.gt(snapshot.outputsCapacity)) {
    // Generate new Spore Id
    txSkeleton = injectNewSporeIds({
      outputIndices: [injectNewSporeResult.outputIndex],
      txSkeleton,
      config,
    });

    // Inject CobuildProof
    const sporeCell = txSkeleton.get('outputs').get(injectNewSporeResult.outputIndex)!;
    const sporeScript = getSporeScript(config, 'Spore', sporeCell.cellOutput.type!);
    if (sporeScript.behaviors?.cobuild) {
      const actionResult = generateCreateSporeAction({
        txSkeleton,
        reference: injectNewSporeResult.reference,
        outputIndex: injectNewSporeResult.outputIndex,
      });
      const injectCobuildProofResult = injectCommonCobuildProof({
        txSkeleton,
        actions: actionResult.actions,
      });
      txSkeleton = injectCobuildProofResult.txSkeleton;
    }

    // Redeem extra capacity
    const sporeAddress = helpers.encodeToAddress(sporeCell.cellOutput.lock, { config: config.lumos });
    const returnExceededCapacityAndPayFeeResult = await returnExceededCapacityAndPayFee({
      txSkeleton,
      changeAddress: props.changeAddress ?? sporeAddress,
      feeRate: props.feeRate,
      fromInfos: props.fromInfos,
      config,
    });
    txSkeleton = returnExceededCapacityAndPayFeeResult.txSkeleton;
  } else {
    // Inject needed capacity and pay fee
    const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
      txSkeleton,
      fromInfos: props.fromInfos,
      changeAddress: props.changeAddress,
      feeRate: props.feeRate,
      updateTxSkeletonAfterCollection(_txSkeleton) {
        // Generate and inject SporeID
        _txSkeleton = injectNewSporeIds({
          outputIndices: [injectNewSporeResult.outputIndex],
          txSkeleton: _txSkeleton,
          config,
        });

        // Inject CobuildProof
        const sporeCell = txSkeleton.get('outputs').get(injectNewSporeResult.outputIndex)!;
        const sporeScript = getSporeScript(config, 'Spore', sporeCell.cellOutput.type!);
        if (sporeScript.behaviors?.cobuild) {
          const actionResult = generateCreateSporeAction({
            txSkeleton: _txSkeleton,
            reference: injectNewSporeResult.reference,
            outputIndex: injectNewSporeResult.outputIndex,
          });
          const injectCobuildProofResult = injectCommonCobuildProof({
            txSkeleton: _txSkeleton,
            actions: actionResult.actions,
          });
          _txSkeleton = injectCobuildProofResult.txSkeleton;
        }

        return _txSkeleton;
      },
      config,
    });
    txSkeleton = injectCapacityAndPayFeeResult.txSkeleton;
  }

  // Make sure the tx size is in range (if needed)
  if (typeof maxTransactionSize === 'number') {
    assertTransactionSkeletonSize(txSkeleton, void 0, maxTransactionSize);
  }

  return {
    txSkeleton,
    outputIndex: injectNewSporeResult.outputIndex,
    reference: injectNewSporeResult.reference,
    mutantReference: injectNewSporeResult.mutantReference,
  };
}

export async function createMultipleSpores(props: {
  sporeInfos: {
    data: SporeDataProps;
    toLock: Script;
  }[];
  fromInfos: FromInfo[];
  fromCells?: Cell[];
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
  mutant?: {
    paymentAmount?: (minPayment: BI, lock: Script, cell: Cell) => BIish;
  };
  maxTransactionSize?: number | false;
  feeRate?: BIish | undefined;
  config?: SporeConfig;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndices: number[];
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);
  const capacityMargin = BI.from(props.capacityMargin ?? 1_0000_0000);

  // TransactionSkeleton
  let txSkeleton = helpers.TransactionSkeleton({
    cellProvider: indexer,
  });

  // Insert input cells in advance for particular purpose
  if (props.fromCells) {
    txSkeleton.update('inputs', (inputs) => {
      for (const cell of props.fromCells!) {
        const address = encodeToAddress(cell.cellOutput.lock, { config: config.lumos });
        const customScript = {
          script: cell.cellOutput.lock,
        };
        const customScriptExists = props.fromInfos.some((fromInfo) => {
          const parsedInfo = parseFromInfo(fromInfo, { config: config.lumos });
          return _.isEqual(customScript, parsedInfo.fromScript);
        });
        if (!customScriptExists) {
          props.fromInfos.push(address);
        }
        inputs = inputs.push(cell);
      }
      return inputs;
    });
  }

  // If referencing a ClusterAgent, get it from the OutPoint
  let clusterAgentCell: Cell | undefined;
  if (props.clusterAgentOutPoint) {
    clusterAgentCell = await getClusterAgentByOutPoint(props.clusterAgentOutPoint, config);
  }

  // Create and inject Spores to Transaction.outputs
  const injectNewSporeResults: Awaited<ReturnType<typeof injectNewSporeOutput>>[] = [];
  for (const sporeInfo of props.sporeInfos) {
    const result = await injectNewSporeOutput({
      txSkeleton,
      data: sporeInfo.data,
      toLock: sporeInfo.toLock,
      fromInfos: props.fromInfos,
      changeAddress: props.changeAddress,
      updateOutput: props.updateOutput,
      clusterAgent: props.clusterAgent,
      cluster: props.cluster,
      mutant: props.mutant,
      clusterAgentCell,
      capacityMargin,
      config,
    });

    txSkeleton = result.txSkeleton;
    injectNewSporeResults.push(result);
  }

  // Inject needed capacity and pay fee
  const sporeOutputIndices = injectNewSporeResults.map((r) => r.outputIndex);
  const injectCapacityAndPayFeeResult = await injectCapacityAndPayFee({
    txSkeleton,
    fromInfos: props.fromInfos,
    changeAddress: props.changeAddress,
    feeRate: props.feeRate,
    updateTxSkeletonAfterCollection(_txSkeleton) {
      // Generate and inject SporeID
      _txSkeleton = injectNewSporeIds({
        txSkeleton: _txSkeleton,
        outputIndices: sporeOutputIndices,
        config,
      });

      // Inject CobuildProof
      const actions = [];
      for (const injectNewSporeResult of injectNewSporeResults) {
        const sporeCell = txSkeleton.get('outputs').get(injectNewSporeResult.outputIndex)!;
        const sporeScript = getSporeScript(config, 'Spore', sporeCell.cellOutput.type!);
        if (sporeScript.behaviors?.cobuild) {
          const actionResult = generateCreateSporeAction({
            txSkeleton: _txSkeleton,
            reference: injectNewSporeResult.reference,
            outputIndex: injectNewSporeResult.outputIndex,
          });
          actions.push(...actionResult.actions);
        }
      }
      if (actions.length) {
        const injectCobuildProofResult = injectCommonCobuildProof({
          txSkeleton: _txSkeleton,
          actions,
        });
        _txSkeleton = injectCobuildProofResult.txSkeleton;
      }

      return _txSkeleton;
    },
    config,
  });
  txSkeleton = injectCapacityAndPayFeeResult.txSkeleton;

  return {
    txSkeleton,
    outputIndices: sporeOutputIndices,
  };
}
