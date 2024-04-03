import { expect } from 'vitest';
import { helpers, HexString } from '@ckb-lumos/lumos';
import { Cell, CellDep, Hash, Script } from '@ckb-lumos/base';
import { getSporeScript, isSporeScriptSupported, SporeConfig, SporeScript } from '../../config';
import { unpackToRawSporeData, RawSporeData } from '../../codec';
import { unpackToRawClusterData, RawClusterData } from '../../codec';
import { unpackToRawClusterProxyArgs, RawClusterProxyArgs } from '../../codec';
import { generateTypeId, isScriptValueEquals } from '../../helpers';
import { getWitnessType, SighashAll, SporeAction, WitnessLayout } from '../../cobuild';
import { UnpackResult } from '@ckb-lumos/codec';

export function getSporeOutput(
  txSkeleton: helpers.TransactionSkeletonType,
  outputIndex: number,
  config: SporeConfig,
): {
  id: Hash;
  cell: Cell;
  data: RawSporeData;
  script: SporeScript;
} {
  const cell = txSkeleton.get('outputs').get(outputIndex);
  expect(cell).toBeDefined();

  const type = cell!.cellOutput.type;
  expect(type).toBeDefined();

  expect(isSporeScriptSupported(config, type!, 'Spore')).toEqual(true);
  const script = getSporeScript(config, 'Spore', type!);

  const id = cell!.cellOutput.type!.args;
  expect(id.length).toBeGreaterThanOrEqual(66);
  expect(id).not.toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');

  const data = unpackToRawSporeData(cell!.data);

  return {
    cell: cell!,
    script,
    data,
    id,
  };
}

export function getClusterOutput(
  txSkeleton: helpers.TransactionSkeletonType,
  outputIndex: number,
  config: SporeConfig,
): {
  id: Hash;
  cell: Cell;
  data: RawClusterData;
  script: SporeScript;
} {
  const cell = txSkeleton.get('outputs').get(outputIndex);
  expect(cell).toBeDefined();

  const type = cell!.cellOutput.type;
  expect(type).toBeDefined();

  expect(isSporeScriptSupported(config, type!, 'Cluster')).toEqual(true);
  const script = getSporeScript(config, 'Cluster', type!);

  const id = cell!.cellOutput.type!.args;
  expect(id.length).toBeGreaterThanOrEqual(66);
  expect(id).not.toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');

  const data = unpackToRawClusterData(cell!.data);

  return {
    cell: cell!,
    script,
    data,
    id,
  };
}

export function getClusterProxyOutput(
  txSkeleton: helpers.TransactionSkeletonType,
  outputIndex: number,
  config: SporeConfig,
): {
  id: Hash;
  cell: Cell;
  data: Hash;
  args: RawClusterProxyArgs;
  script: SporeScript;
} {
  const cell = txSkeleton.get('outputs').get(outputIndex);
  expect(cell).toBeDefined();

  const type = cell!.cellOutput.type;
  expect(type).toBeDefined();

  expect(isSporeScriptSupported(config, type!, 'ClusterProxy')).toEqual(true);
  const script = getSporeScript(config, 'ClusterProxy', type!);

  const args = unpackToRawClusterProxyArgs(type!.args);
  const id = args.id;
  expect(id.length).toBeGreaterThanOrEqual(66);
  expect(id).not.toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');

  const data = cell!.data;
  expect(data.length).toBeGreaterThanOrEqual(66);

  return {
    cell: cell!,
    script,
    data,
    args,
    id,
  };
}

export function getClusterAgentOutput(
  txSkeleton: helpers.TransactionSkeletonType,
  outputIndex: number,
  config: SporeConfig,
): {
  id: Hash;
  cell: Cell;
  data: Hash;
  script: SporeScript;
} {
  const cell = txSkeleton.get('outputs').get(outputIndex);
  expect(cell).toBeDefined();

  const type = cell!.cellOutput.type;
  expect(type).toBeDefined();

  expect(isSporeScriptSupported(config, type!, 'ClusterAgent')).toEqual(true);
  const script = getSporeScript(config, 'ClusterAgent', type!);

  const id = type!.args;
  expect(id.length).toBeGreaterThanOrEqual(66);
  expect(id).not.toEqual('0x0000000000000000000000000000000000000000000000000000000000000000');

  const data = cell!.data;
  expect(data.length).toBeGreaterThanOrEqual(66);

  return {
    cell: cell!,
    script,
    data,
    id,
  };
}

export function expectTypeId(txSkeleton: helpers.TransactionSkeletonType, outputIndex: number, expectId: Hash) {
  const firstInput = txSkeleton.get('inputs').get(0);
  expect(firstInput).toBeDefined();

  const generatedTypeId = generateTypeId(firstInput!, outputIndex);
  expect(expectId).toEqual(generatedTypeId);
}

export function expectCell(
  txSkeleton: helpers.TransactionSkeletonType,
  source: 'input' | 'output' | 'both',
  find: (cell: Cell) => boolean,
) {
  const input = txSkeleton.get('inputs').find(find);
  const output = txSkeleton.get('outputs').find(find);
  if (source === 'input') {
    expect(input).toBeDefined();
    expect(output).not.toBeDefined();
  }
  if (source === 'output') {
    expect(input).not.toBeDefined();
    expect(output).toBeDefined();
  }
  if (source === 'both') {
    expect(input).toBeDefined();
    expect(output).toBeDefined();
  }
}

export function expectLockCell(
  txSkeleton: helpers.TransactionSkeletonType,
  source: 'input' | 'output' | 'both',
  lock: Script,
) {
  expectCell(txSkeleton, source, findCellByLock(lock));
}

export function expectTypeCell(
  txSkeleton: helpers.TransactionSkeletonType,
  source: 'input' | 'output' | 'both',
  type: Script,
) {
  expectCell(txSkeleton, source, findCellByType(type));
}

export function expectCellDep(txSkeleton: helpers.TransactionSkeletonType, cellDep: CellDep) {
  const cellDeps = txSkeleton.get('cellDeps');
  const cellDepIndex = cellDeps.findIndex((dep) => {
    return (
      dep.outPoint.txHash === cellDep.outPoint.txHash &&
      dep.outPoint.index === cellDep.outPoint.index &&
      dep.depType === cellDep.depType
    );
  });

  expect(cellDepIndex).toBeGreaterThanOrEqual(0);
}

export function expectCellLock(cell: Cell, locks: Script[]) {
  const anyMatch = locks.some((lock) => isScriptValueEquals(cell.cellOutput.lock, lock));
  expect(anyMatch).toEqual(true);
}

export function findCellByLock(lock: Script) {
  return (cell: Cell) => isScriptValueEquals(lock, cell.cellOutput.lock);
}

export function findCellByType(type: Script) {
  return (cell: Cell) => !!cell.cellOutput.type && isScriptValueEquals(type, cell.cellOutput.type);
}

export function getActionsFromCobuildWitnessLayout(witness: HexString) {
  const witnessType = getWitnessType(witness);
  expect(witnessType).toEqual('SighashAll');

  const witnessLayout = WitnessLayout.unpack(witness);
  return (witnessLayout.value as UnpackResult<typeof SighashAll>).message.actions.map((action) => {
    return {
      scriptInfoHash: action.scriptInfoHash,
      scriptHash: action.scriptHash,
      data: action.data,
      sporeActionData: SporeAction.unpack(action.data),
    };
  });
}
