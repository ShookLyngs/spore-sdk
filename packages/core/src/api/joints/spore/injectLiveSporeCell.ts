import { BIish } from '@ckb-lumos/bi';
import { PackedSince } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString } from '@ckb-lumos/lumos';
import { addCellDep } from '@ckb-lumos/common-scripts/lib/helper';
import { decodeContentType, isContentTypeValid, setAbsoluteCapacityMargin, setupCell } from '../../../helpers';
import { getSporeConfig, getSporeScript, SporeConfig } from '../../../config';
import { unpackToRawSporeData } from '../../../codec';
import { getMutantById } from '../mutant/getMutant';

export async function injectLiveSporeCell(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  cell: Cell;
  addOutput?: boolean;
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
}> {
  // Env
  const config = props.config ?? getSporeConfig();
  const sporeCell = props.cell;

  // Get TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Check target cell's type script id
  const sporeType = sporeCell.cellOutput.type;
  const sporeScript = getSporeScript(config, 'Spore', sporeType!);
  if (!sporeType || !sporeScript) {
    throw new Error('Cannot inject live spore because target cell type is not a supported version of Spore');
  }

  // Add spore to Transaction.inputs
  const setupCellResult = await setupCell({
    txSkeleton,
    input: sporeCell,
    addOutput: props.addOutput,
    updateOutput(cell) {
      if (props.capacityMargin !== void 0) {
        cell = setAbsoluteCapacityMargin(cell, props.capacityMargin);
      }
      if (props.updateOutput instanceof Function) {
        cell = props.updateOutput(cell);
      }
      return cell;
    },
    defaultWitness: props.defaultWitness,
    updateWitness: props.updateWitness,
    config: config.lumos,
    since: props.since,
  });
  txSkeleton = setupCellResult.txSkeleton;

  // If added to outputs, fix the cell's output index
  if (props.addOutput) {
    txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
      return fixedEntries.push({
        field: 'outputs',
        index: setupCellResult.outputIndex,
      });
    });
  }

  // Add Spore script as cellDep
  txSkeleton = addCellDep(txSkeleton, sporeScript.cellDep);

  // Validate SporeData.contentType
  const sporeData = unpackToRawSporeData(sporeCell.data);
  if (!isContentTypeValid(sporeData.contentType)) {
    throw new Error(`Spore has specified invalid ContentType: ${sporeData.contentType}`);
  }

  // Add Mutant cells as cellDeps
  const decodedContentType = decodeContentType(sporeData.contentType);
  if (decodedContentType.parameters.mutant !== void 0) {
    const mutantScript = getSporeScript(config, 'Mutant');
    txSkeleton = addCellDep(txSkeleton, mutantScript.cellDep);

    const mutantParameter = decodedContentType.parameters.mutant;
    const mutantIds = Array.isArray(mutantParameter) ? mutantParameter : [mutantParameter];
    const mutantCells = await Promise.all(mutantIds.map((id) => getMutantById(id, config)));

    for (const mutantCell of mutantCells) {
      txSkeleton = addCellDep(txSkeleton, {
        outPoint: mutantCell.outPoint!,
        depType: 'code',
      });
    }
  }

  return {
    txSkeleton,
    inputIndex: setupCellResult.inputIndex,
    outputIndex: setupCellResult.outputIndex,
  };
}
