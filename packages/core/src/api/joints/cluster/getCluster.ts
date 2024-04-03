import { OutPoint, Script } from '@ckb-lumos/base';
import { Cell, HexString, Indexer, RPC } from '@ckb-lumos/lumos';
import { getCellByType, getCellWithStatusByOutPoint, isTypeId } from '../../../helpers';
import { getSporeConfig, getSporeScriptCategory, isSporeScriptSupported, SporeConfig } from '../../../config';

export async function getClusterByType(type: Script, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);

  // Check if the cluster's id is TypeID
  if (!isTypeId(type.args)) {
    throw new Error(`Target Cluster Id is invalid: ${type.args}`);
  }

  // Get cell by type
  const cell = await getCellByType({ type, indexer });
  if (cell === void 0) {
    throw new Error('Cannot find Cluster by Type because target cell does not exist');
  }

  // Check target cell's type script
  const cellType = cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'Cluster')) {
    throw new Error('Cannot find Cluster by Type because target cell is not a supported version of Cluster');
  }

  return cell;
}

export async function getClusterByOutPoint(outPoint: OutPoint, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const rpc = new RPC(config.ckbNodeUrl);

  // Get cell from rpc
  const cellWithStatus = await getCellWithStatusByOutPoint({
    outPoint,
    rpc,
  });
  if (!cellWithStatus.cell) {
    throw new Error('Cannot find Cluster by OutPoint because target cell was not found');
  }
  if (cellWithStatus.status !== 'live') {
    throw new Error('Cannot find Cluster by OutPoint because target cell is not lived');
  }

  // Check target cell's type script
  const cellType = cellWithStatus.cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'Cluster')) {
    throw new Error('Cannot find Cluster by OutPoint because target cell is not a supported version of Cluster');
  }

  return cellWithStatus.cell;
}

export async function getClusterById(id: HexString, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();

  // Check if the cluster's id is TypeID
  if (!isTypeId(id)) {
    throw new Error(`Target ClusterId is invalid: ${id}`);
  }

  // Get cluster script
  const clusterScript = getSporeScriptCategory(config, 'Cluster');
  const scripts = (clusterScript.versions ?? []).map((r) => r.script);

  // Search target cluster from the latest version to the oldest
  for (const script of scripts) {
    try {
      return await getClusterByType(
        {
          ...script,
          args: id,
        },
        config,
      );
    } catch (e) {
      // Not found in the script, don't have to do anything
      console.error('getClusterById error:', e);
    }
  }

  throw new Error(
    `Cannot find Cluster by Id because target cell does not exist or it's not a supported version of Cluster`,
  );
}
