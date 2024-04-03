import { Hash } from '@ckb-lumos/base';
import { UnpackResult } from '@ckb-lumos/codec';
import { PackParam } from '@ckb-lumos/codec/src/base';
import { ScriptInfo } from '../codec/buildingPacket';

export const sporeScriptInfoMessageType = 'SporeAction';

export const sporeScriptInfoSchema = `
array Byte32 [byte; 32];
vector Bytes <byte>;

table Script {
    code_hash: Byte32,
    hash_type: byte,
    args: Bytes,
}

union Address {
    Script,
}

/* Actions for Spore */

table MintSpore {
    spore_id: Byte32,
    to: Address,
    data_hash: Byte32,
}

table TransferSpore {
    spore_id: Byte32,
    from: Address,
    to: Address,
}

table BurnSpore {
    spore_id: Byte32,
    from: Address,
}

/* Actions for Cluster */

table MintCluster {
    cluster_id: Byte32,
    to: Address,
    data_hash: Byte32,
}

table TransferCluster {
    cluster_id: Byte32,
    from: Address,
    to: Address,
}

/* Actions for Cluster/Proxy */

table MintProxy {
    cluster_id: Byte32,
    proxy_id: Byte32,
    to: Address,
}

table TransferProxy {
    cluster_id: Byte32,
    proxy_id: Byte32,
    from: Address,
    to: Address,
}

table BurnProxy {
    cluster_id: Byte32,
    proxy_id: Byte32,
    from: Address,
}

/* Actions for Cluster/Agent */

table MintAgent {
    cluster_id: Byte32,
    proxy_id: Byte32,
    to: Address,
}

table TransferAgent {
    cluster_id: Byte32,
    from: Address,
    to: Address,
}

table BurnAgent {
    cluster_id: Byte32,
    from: Address,
}

/* Action in ScriptInfo */

union SporeAction {
    MintSpore,
    TransferSpore,
    BurnSpore,

    MintCluster,
    TransferCluster,

    MintProxy,
    TransferProxy,
    BurnProxy,

    MintAgent,
    TransferAgent,
    BurnAgent,
}
`;

export const sporeScriptInfoTemplate: Omit<PackParam<typeof ScriptInfo>, 'scriptHash'> = {
  name: 'spore',
  url: 'https://spore.pro',
  schema: sporeScriptInfoSchema,
  messageType: sporeScriptInfoMessageType,
};

export function createSporeScriptInfoFromTemplate(props: { scriptHash: Hash }): UnpackResult<typeof ScriptInfo> {
  return {
    ...sporeScriptInfoTemplate,
    scriptHash: props.scriptHash,
  };
}
