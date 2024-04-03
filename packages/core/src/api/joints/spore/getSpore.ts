import { OutPoint, Script } from '@ckb-lumos/base';
import { Cell, HexString, Indexer, RPC } from '@ckb-lumos/lumos';
import { getCellByType, getCellWithStatusByOutPoint, isTypeId } from '../../../helpers';
import { getSporeConfig, getSporeScriptCategory, isSporeScriptSupported, SporeConfig } from '../../../config';

export async function getSporeByType(type: Script, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);

  // Check if the spore's id is TypeID
  if (!isTypeId(type.args)) {
    throw new Error(`Target Spore ID is invalid: ${type.args}`);
  }

  // Get cell by type
  const cell = await getCellByType({ type, indexer });
  if (cell === void 0) {
    throw new Error('Cannot find Spore by Type because target cell does not exist');
  }

  // Check target cell's type script
  const cellType = cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'Spore')) {
    throw new Error('Cannot find spore by Type because target cell type is not a supported version of Spore');
  }

  return cell;
}

export async function getSporeByOutPoint(outPoint: OutPoint, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const rpc = new RPC(config.ckbNodeUrl);

  // Get cell from rpc
  const cellWithStatus = await getCellWithStatusByOutPoint({ outPoint, rpc });
  if (!cellWithStatus.cell) {
    throw new Error('Cannot find spore by OutPoint because target cell was not found');
  }
  if (cellWithStatus.status !== 'live') {
    throw new Error('Cannot find spore by OutPoint because target cell is not lived');
  }

  // Check target cell's type script
  const cellType = cellWithStatus.cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'Spore')) {
    throw new Error('Cannot find spore by OutPoint because target cell type is not a supported version of Spore');
  }

  return cellWithStatus.cell;
}

export async function getSporeById(id: HexString, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();

  // Check if the spore's id is TypeID
  if (!isTypeId(id)) {
    throw new Error('Cannot find spore because target SporeId is not valid');
  }

  // Get SporeType script
  const sporeScript = getSporeScriptCategory(config, 'Spore');
  const scripts = (sporeScript.versions ?? []).map((r) => r.script);

  // Search target spore from the latest version to the oldest
  for (const script of scripts) {
    try {
      return await getSporeByType(
        {
          ...script,
          args: id,
        },
        config,
      );
    } catch {
      // Not found in the script, don't have to do anything
    }
  }

  throw new Error(
    `Cannot find spore by SporeId because target cell does not exist or it's not a supported version of Spore`,
  );
}
