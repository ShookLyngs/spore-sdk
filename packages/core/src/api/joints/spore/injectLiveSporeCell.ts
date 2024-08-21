import { BIish } from '@ckb-lumos/bi';
import { PackedSince } from '@ckb-lumos/base';
import { BI, Cell, helpers, HexString, Indexer, Script } from '@ckb-lumos/lumos';
import { addCellDep, parseAddress } from '@ckb-lumos/lumos/helpers';
import {
  decodeContentType,
  getCellByType,
  isContentTypeValid,
  setAbsoluteCapacityMargin,
  setupCell,
} from '../../../helpers';
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
      // May contain code about changing scripts, which causes the change of cell's occupied capacity,
      // so here should be processed at first
      if (props.updateOutput instanceof Function) {
        cell = props.updateOutput(cell);
      }
      if (props.capacityMargin !== void 0) {
        cell = setAbsoluteCapacityMargin(cell, props.capacityMargin);
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
  let sporeCelldep = sporeScript.cellDep;
  if (sporeScript.behaviors?.dynamicCelldep) {
    const scriptCell = await getCellByType({
      type: sporeScript.behaviors?.dynamicCelldep,
      indexer: new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl),
    });
    if (scriptCell) {
      sporeCelldep = {
        outPoint: scriptCell.outPoint!,
        depType: 'code',
      };
    }
  }
  txSkeleton = addCellDep(txSkeleton, sporeCelldep);

  // Validate SporeData.contentType
  const sporeData = unpackToRawSporeData(sporeCell.data);
  // note: consider the compatibility of custom spore-like scripts, skip content-type check is allowed
  if (isContentTypeValid(sporeData.contentType)) {
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
  }

  return {
    txSkeleton,
    inputIndex: setupCellResult.inputIndex,
    outputIndex: setupCellResult.outputIndex,
  };
}
