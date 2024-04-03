import { utils } from '@ckb-lumos/lumos';
import { bytes } from '@ckb-lumos/codec';
import { Hash, Script } from '@ckb-lumos/base';

export type RawClusterAgentData = Script;

export function packRawClusterAgentDataToHash(packable: RawClusterAgentData): Hash {
  return utils.computeScriptHash(packable);
}

export function packRawClusterAgentData(packable: RawClusterAgentData): Uint8Array {
  const hash = packRawClusterAgentDataToHash(packable);
  return bytes.bytify(hash);
}
