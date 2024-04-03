import { bytes } from '@ckb-lumos/codec';
import { Config } from '@ckb-lumos/config-manager';
import { common, FromInfo } from '@ckb-lumos/common-scripts';
import { Hash, OutPoint, PackedSince, Script } from '@ckb-lumos/base';
import { Cell, helpers, HexString, Indexer, RPC } from '@ckb-lumos/lumos';
import { CKBComponents } from '@ckb-lumos/rpc/lib/types/api';
import { ScriptId } from '../codec';
import { isScriptValueEquals } from './script';

/**
 * Find and return the first cell of target type script from CKB Indexer.
 */
export async function getCellByType(props: { type: Script; indexer: Indexer }) {
  const collector = props.indexer.collector({
    type: props.type,
  });

  for await (const cell of collector.collect()) {
    return cell;
  }

  return void 0;
}

/**
 * A wrapper function, to get a Cell structure from RPC.getLiveCell() method.
 */
export async function getCellWithStatusByOutPoint(props: { outPoint: OutPoint; rpc: RPC }): Promise<{
  cell?: Cell;
  status: CKBComponents.CellStatus;
}> {
  const liveCell = await props.rpc.getLiveCell(props.outPoint, true);
  const cell: Cell | undefined = liveCell.cell
    ? {
        cellOutput: liveCell.cell.output,
        data: liveCell.cell.data.content,
        outPoint: props.outPoint,
      }
    : void 0;

  return {
    cell,
    status: liveCell.status,
  };
}

/**
 * Inject a cell to Transaction.inputs, and to Transaction.outputs if needed.
 * The function also adds needed/supported witness placeholders and cellDeps.
 */
export async function setupCell(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  input: Cell;
  fromInfo?: FromInfo;
  addOutput?: boolean;
  updateOutput?(cell: Cell): Cell;
  defaultWitness?: HexString;
  updateWitness?: HexString | ((witness: HexString) => HexString);
  since?: PackedSince;
  config?: Config;
}): Promise<{
  txSkeleton: helpers.TransactionSkeletonType;
  inputIndex: number;
  outputIndex: number;
}> {
  // Env
  const addOutput = props.addOutput ?? false;

  // Get TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Add target cell to inputs and outputs,
  // the function also handles witnesses and cellDeps
  txSkeleton = await common.setupInputCell(txSkeleton, props.input, props.fromInfo, {
    defaultWitness: props.defaultWitness,
    config: props.config,
    since: props.since,
  });

  // Remove it from outputs if not needed
  if (!addOutput) {
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      return outputs.remove(outputs.size - 1);
    });
  }

  // Indices
  const inputIndex = txSkeleton.get('inputs').size - 1;
  const outputIndex = addOutput ? txSkeleton.get('outputs').size - 1 : -1;

  // If added output, and need to update the added output
  if (addOutput && props.updateOutput instanceof Function) {
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      const output = outputs.last();
      if (!output) {
        throw new Error('Cannot update output because the added output could not be found');
      }

      return outputs.set(outputIndex, props.updateOutput!(output));
    });
  }

  // If required to update the resulting witness placeholder
  if (props.updateWitness) {
    txSkeleton = txSkeleton.update('witnesses', (witnesses) => {
      if (props.updateWitness instanceof Function) {
        const witness = witnesses.get(inputIndex);
        if (!witness) {
          throw new Error(`Cannot update Transaction.witnesses[${inputIndex}] because it's undefined`);
        }
        return witnesses.set(inputIndex, props.updateWitness(witness));
      }
      if (typeof props.updateWitness === 'string') {
        return witnesses.set(inputIndex, props.updateWitness);
      }
      return witnesses;
    });
  }

  return {
    txSkeleton,
    inputIndex,
    outputIndex,
  };
}

/**
 * Group cells by TypeScriptID.
 */
export function groupCells(cells: Cell[]): Record<Hash | 'null', { index: number; cell: Cell }[]> {
  const groups: Record<Hash | 'null', { index: number; cell: Cell }[]> = {};
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const scriptIdHash = cell.cellOutput.type ? bytes.hexify(ScriptId.pack(cell.cellOutput.type)) : 'null';
    if (groups[scriptIdHash] === void 0) {
      groups[scriptIdHash] = [];
    }
    groups[scriptIdHash].push({
      index: i,
      cell,
    });
  }

  return groups;
}

export function findCellIndexByScriptFromTransactionSkeleton(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  source: 'inputs' | 'outputs';
  scriptName: 'lock' | 'type';
  script: Script;
}): number {
  if (!['inputs', 'outputs'].includes(props.source)) {
    throw new Error('Can only find cell from the following source: "inputs" | "outputs"');
  }
  if (!['lock', 'type'].includes(props.scriptName)) {
    throw new Error('Can only find cell from the following scriptType: "lock" | "type"');
  }

  const list = props.txSkeleton.get(props.source);
  return list.findIndex((cell) => {
    return !!cell.cellOutput[props.scriptName] && isScriptValueEquals(cell.cellOutput[props.scriptName]!, props.script);
  });
}
