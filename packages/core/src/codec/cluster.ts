import { blockchain, Hash } from '@ckb-lumos/base';
import { bytes, BytesLike, molecule } from '@ckb-lumos/codec';
import { bytifyRawString, bufferToRawString } from '../helpers';

export const ClusterDataV1 = molecule.table(
  {
    name: blockchain.Bytes,
    description: blockchain.Bytes,
  },
  ['name', 'description'],
);
export const ClusterDataV2 = molecule.table(
  {
    name: blockchain.Bytes,
    description: blockchain.Bytes,
    mutantId: blockchain.BytesOpt,
  },
  ['name', 'description', 'mutantId'],
);

export interface RawClusterDataV1 {
  name: string;
  description: string;
}
export interface RawClusterDataV2 {
  name: string;
  description: string;
  mutantId?: Hash;
}
export type RawClusterData = RawClusterDataV2;

export type ClusterDataVersion = 'v1' | 'v2';

/**
 * Pack RawClusterData to Uint8Array.
 * Pass an optional "version" field to select a specific packing version.
 */
export function packRawClusterData(packable: RawClusterData): Uint8Array;
export function packRawClusterData(packable: RawClusterDataV1, version: 'v1'): Uint8Array;
export function packRawClusterData(packable: RawClusterDataV2, version: 'v2'): Uint8Array;
export function packRawClusterData(packable: RawClusterDataV1 | RawClusterDataV2, version?: unknown): Uint8Array {
  if (!version) {
    return packRawClusterDataV2(packable);
  }

  switch (version) {
    case 'v1':
      return packRawClusterDataV1(packable);
    case 'v2':
      return packRawClusterDataV2(packable);
    default:
      throw new Error(`Unsupported ClusterData version: ${version}`);
  }
}
export function packRawClusterDataV1(packable: RawClusterDataV1): Uint8Array {
  return ClusterDataV1.pack({
    name: bytifyRawString(packable.name),
    description: bytifyRawString(packable.description),
  });
}
export function packRawClusterDataV2(packable: RawClusterDataV2): Uint8Array {
  return ClusterDataV2.pack({
    name: bytifyRawString(packable.name),
    description: bytifyRawString(packable.description),
    mutantId: packable.mutantId,
  });
}

/**
 * Unpack Hex/Bytes to RawClusterData.
 * Pass an optional "version" field to select a specific unpacking version.
 */
export function unpackToRawClusterData(unpackable: BytesLike): RawClusterData;
export function unpackToRawClusterData(unpackable: BytesLike, version: 'v1'): RawClusterDataV1;
export function unpackToRawClusterData(unpackable: BytesLike, version: 'v2'): RawClusterDataV2;
export function unpackToRawClusterData(unpackable: BytesLike, version?: unknown): unknown {
  if (version) {
    switch (version) {
      case 'v1':
        return unpackToRawClusterDataV1(unpackable);
      case 'v2':
        return unpackToRawClusterDataV2(unpackable);
      default:
        throw new Error(`Unsupported ClusterData version: ${version}`);
    }
  }

  try {
    return unpackToRawClusterDataV2(unpackable);
  } catch {
    try {
      return unpackToRawClusterDataV1(unpackable);
    } catch {
      throw new Error(`Cannot unpack ClusterData, no matching molecule: ${bytes.hexify(unpackable)}`);
    }
  }
}
export function unpackToRawClusterDataV1(unpackable: BytesLike): RawClusterDataV1 {
  const decoded = ClusterDataV1.unpack(unpackable);
  return {
    name: bufferToRawString(decoded.name),
    description: bufferToRawString(decoded.description),
  };
}
export function unpackToRawClusterDataV2(unpackable: BytesLike): RawClusterDataV2 {
  const decoded = ClusterDataV2.unpack(unpackable);
  return {
    name: bufferToRawString(decoded.name),
    description: bufferToRawString(decoded.description),
    mutantId: decoded.mutantId,
  };
}
