import { BIish } from '@ckb-lumos/bi';
import { Hash } from '@ckb-lumos/base';
import { BI, Cell, utils } from '@ckb-lumos/lumos';
import { bytes, BytesLike } from '@ckb-lumos/codec';

/**
 * Generate a TypeId based on the first input in Transaction.inputs,
 * and the index of the target cell in Transaction.outputs.
 */
export function generateTypeId(firstInput: Cell, outputIndex: BIish): Hash {
  if (!firstInput.outPoint) {
    throw new Error('Cannot generate TypeId because Transaction.inputs[0] has no OutPoint');
  }

  const script = utils.generateTypeIdScript(
    {
      previousOutput: firstInput.outPoint,
      since: '0x0',
    },
    BI.from(outputIndex).toHexString(),
  );

  return script.args;
}

/**
 * Generate TypeIds for a group of cells in Transaction.outputs.
 */
export function generateTypeIdGroup(
  firstInput: Cell,
  outputs: Cell[],
  filter: (cell: Cell) => boolean,
): [number, Hash][] {
  const group: [number, Hash][] = [];

  for (let i = 0; i < outputs.length; i++) {
    const isTarget = filter(outputs[i]);
    if (isTarget) {
      const groupIndex = group.length;
      group.push([i, generateTypeId(firstInput, groupIndex)]);
    }
  }

  return group;
}

/**
 * Generate TypeIds from a Transaction.outputs.
 *
 * This function is different from the `generateTypeIdGroup` function,
 * because this function generates TypeIds based on each output's original index in the list,
 * instead of generating them by each output's index in a group.
 */
export function generateTypeIdsByOutputs(
  firstInput: Cell,
  outputs: Cell[],
  filter?: (cell: Cell) => boolean,
): [number, Hash][] {
  function filterOutput(cell: Cell): boolean {
    return filter instanceof Function ? filter(cell) : true;
  }

  const result: [number, Hash][] = [];
  for (let i = 0; i < outputs.length; i++) {
    if (filterOutput(outputs[i])) {
      result.push([i, generateTypeId(firstInput, i)]);
    }
  }

  return result;
}

/**
 * Check if the target string is a Type ID
 */
export function isTypeId(target: BytesLike): boolean {
  try {
    const buf = bytes.bytify(target);
    return buf.byteLength === 32;
  } catch {
    return false;
  }
}

/**
 * Check if the target string at least contains is a Type ID
 */
export function isTypeIdLengthMatch(target: BytesLike): boolean {
  try {
    const buf = bytes.bytify(target);
    return buf.byteLength >= 32;
  } catch {
    return false;
  }
}
