import { List } from 'immutable';
import { Cell, Input } from '@ckb-lumos/lumos';
import { UnpackResult } from '@ckb-lumos/codec';
import { ResolvedInputs } from '../codec/buildingPacket';

export function inputCellsToResolvedInputs(
  inputs: List<Cell>,
  filter?: (value: Cell, index: number, iter: List<Cell>) => boolean,
): UnpackResult<typeof ResolvedInputs> {
  if (filter instanceof Function) {
    inputs = inputs.filter(filter);
  }

  return inputs.reduce<UnpackResult<typeof ResolvedInputs>>(
    (sum, input) => {
      sum.outputs.push(input.cellOutput);
      sum.outputsData.push(input.data);
      return sum;
    },
    {
      outputs: [],
      outputsData: [],
    },
  );
}

export function resolvedInputsToInputCells(
  inputs: Input[],
  resolvedInputs: UnpackResult<typeof ResolvedInputs>,
): Cell[] {
  return inputs.map((input, index) => {
    return {
      cellOutput: resolvedInputs.outputs[index],
      data: resolvedInputs.outputsData[index],
      outPoint: input.previousOutput,
    };
  });
}
