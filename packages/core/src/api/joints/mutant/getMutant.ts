import { bytes } from '@ckb-lumos/codec';
import { Cell, Indexer, RPC } from '@ckb-lumos/lumos';
import { Hash, OutPoint, Script } from '@ckb-lumos/base';
import { packRawMutantArgs } from '../../../codec';
import { getCellByType, getCellWithStatusByOutPoint } from '../../../helpers';
import { getSporeConfig, getSporeScriptCategory, isSporeScriptSupported, SporeConfig } from '../../../config';

export async function getMutantByType(type: Script, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);

  // Get cell by type
  const cell = await getCellByType({ type, indexer });
  if (cell === void 0) {
    throw new Error('Cannot find Mutant by Type because target cell does not exist');
  }

  // Check target cell's type script
  const cellType = cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'Mutant')) {
    throw new Error('Cannot find Mutant by Type because target cell is not a supported version of Mutant');
  }

  return cell;
}

export async function getMutantByOutPoint(outPoint: OutPoint, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const rpc = new RPC(config.ckbNodeUrl);

  // Get cell from rpc
  const cellWithStatus = await getCellWithStatusByOutPoint({
    outPoint,
    rpc,
  });
  if (!cellWithStatus.cell) {
    throw new Error('Cannot find Mutant by OutPoint because target cell was not found');
  }
  if (cellWithStatus.status !== 'live') {
    throw new Error('Cannot find Mutant by OutPoint because target cell is not lived');
  }

  // Check target cell's type script
  const cellType = cellWithStatus.cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'Mutant')) {
    throw new Error('Cannot find Mutant by OutPoint because target cell is not a supported version of Mutant');
  }

  return cellWithStatus.cell;
}

export async function getMutantById(id: Hash, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();

  // Get Mutant script
  const mutantScript = getSporeScriptCategory(config, 'Mutant');
  const scripts = (mutantScript.versions ?? []).map((r) => r.script);

  // Search target cluster proxy from the latest version to the oldest
  const args = bytes.hexify(
    packRawMutantArgs({
      id,
    }),
  );
  for (const script of scripts) {
    try {
      return await getMutantByType(
        {
          ...script,
          args,
        },
        config,
      );
    } catch (e) {
      // Not found in the script, don't have to do anything
      console.error('getMutantById error:', e);
    }
  }

  throw new Error(
    `Cannot find Mutant by ID because target cell does not exist or it's not a supported version of Mutant`,
  );
}
