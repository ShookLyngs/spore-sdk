import { bytes } from '@ckb-lumos/codec';
import { helpers } from '@ckb-lumos/lumos';
import { generateTypeIdsByOutputs } from '../../../helpers';
import { packRawMutantArgs, unpackToRawMutantArgs } from '../../../codec';
import { getSporeConfig, isSporeScriptSupported, SporeConfig } from '../../../config';

export function injectNewMutantIds(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndices?: number[];
  config?: SporeConfig;
}): helpers.TransactionSkeletonType {
  // Env
  const config = props.config ?? getSporeConfig();

  // TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Get the Transaction.inputs[0]
  const firstInput = txSkeleton.get('inputs').get(0);
  if (!firstInput) {
    throw new Error('Cannot generate Mutant Id because Transaction.inputs[0] does not exist');
  }

  // Generate TypeIds by the output indices
  let outputs = txSkeleton.get('outputs');
  let typeIdGroup = generateTypeIdsByOutputs(firstInput, outputs.toArray(), (cell) => {
    return !!cell.cellOutput.type && isSporeScriptSupported(config, cell.cellOutput.type, 'Mutant');
  });

  // Only keep the TypeIDs corresponding to the specified output indices
  if (props.outputIndices) {
    typeIdGroup = typeIdGroup.filter(([outputIndex]) => {
      const index = props.outputIndices!.findIndex((index) => index === outputIndex);
      return index >= 0;
    });
    if (typeIdGroup.length !== props.outputIndices.length) {
      throw new Error('Cannot generate Mutant Id because outputIndices cannot be fully handled');
    }
  }

  // Update results
  for (const [index, typeId] of typeIdGroup) {
    const output = outputs.get(index);
    if (!output) {
      throw new Error(`Cannot generate Mutant Id because Transaction.outputs[${index}] does not exist`);
    }

    const unpackedArgs = unpackToRawMutantArgs(output.cellOutput.type!.args);
    const packedNewArgs = packRawMutantArgs({
      id: typeId,
      minPayment: unpackedArgs.minPayment,
    });

    output.cellOutput.type!.args = bytes.hexify(packedNewArgs);
    outputs = outputs.set(index, output);
  }

  return txSkeleton.set('outputs', outputs);
}
