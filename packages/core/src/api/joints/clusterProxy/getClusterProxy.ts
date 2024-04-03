import { bytes } from '@ckb-lumos/codec';
import { Cell, Indexer, RPC } from '@ckb-lumos/lumos';
import { Hash, OutPoint, Script } from '@ckb-lumos/base';
import { getCellByType, getCellWithStatusByOutPoint } from '../../../helpers';
import { getSporeConfig, getSporeScriptCategory, isSporeScriptSupported, SporeConfig } from '../../../config';
import { packRawClusterProxyArgs } from '../../../codec';

export async function getClusterProxyByType(type: Script, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const indexer = new Indexer(config.ckbIndexerUrl, config.ckbNodeUrl);

  // Get cell by type
  const cell = await getCellByType({ type, indexer });
  if (cell === void 0) {
    throw new Error('Cannot find ClusterProxy by Type because target cell does not exist');
  }

  // Check target cell's type script
  const cellType = cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'ClusterProxy')) {
    throw new Error('Cannot find ClusterProxy by Type because target cell is not a supported version of ClusterProxy');
  }

  return cell;
}

export async function getClusterProxyByOutPoint(outPoint: OutPoint, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();
  const rpc = new RPC(config.ckbNodeUrl);

  // Get cell from rpc
  const cellWithStatus = await getCellWithStatusByOutPoint({
    outPoint,
    rpc,
  });
  if (!cellWithStatus.cell) {
    throw new Error('Cannot find ClusterProxy by OutPoint because target cell was not found');
  }
  if (cellWithStatus.status !== 'live') {
    throw new Error('Cannot find ClusterProxy by OutPoint because target cell is not lived');
  }

  // Check target cell's type script
  const cellType = cellWithStatus.cell.cellOutput.type;
  if (!cellType || !isSporeScriptSupported(config, cellType, 'ClusterProxy')) {
    throw new Error(
      'Cannot find ClusterProxy by OutPoint because target cell is not a supported version of ClusterProxy',
    );
  }

  return cellWithStatus.cell;
}

export async function getClusterProxyById(id: Hash, config?: SporeConfig): Promise<Cell> {
  // Env
  config = config ?? getSporeConfig();

  // Get ClusterProxy script
  const clusterProxyScript = getSporeScriptCategory(config, 'ClusterProxy');
  const scripts = (clusterProxyScript.versions ?? []).map((r) => r.script);

  // Search target cluster proxy from the latest version to the oldest
  const args = bytes.hexify(
    packRawClusterProxyArgs({
      id,
    }),
  );
  for (const script of scripts) {
    try {
      return await getClusterProxyByType(
        {
          ...script,
          args,
        },
        config,
      );
    } catch (e) {
      // Not found in the script, don't have to do anything
      console.error('getClusterProxyById error:', e);
    }
  }

  throw new Error(
    `Cannot find ClusterProxy by ID because target cell does not exist or it's not a supported version of ClusterProxy`,
  );
}
