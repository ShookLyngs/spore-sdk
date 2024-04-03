import { blockchain, Hash } from '@ckb-lumos/base';
import { BytesLike, molecule } from '@ckb-lumos/codec';
import { bufferToRawString, bytifyRawString } from '../helpers';

export const SporeData = molecule.table(
  {
    contentType: blockchain.Bytes,
    content: blockchain.Bytes,
    clusterId: blockchain.BytesOpt,
  },
  ['contentType', 'content', 'clusterId'],
);

export interface RawSporeData {
  contentType: string;
  content: BytesLike;
  clusterId?: Hash;
}

export function packRawSporeData(packable: RawSporeData): Uint8Array {
  return SporeData.pack({
    contentType: bytifyRawString(packable.contentType),
    content: packable.content,
    clusterId: packable.clusterId,
  });
}

export function unpackToRawSporeData(unpackable: BytesLike): RawSporeData {
  const unpacked = SporeData.unpack(unpackable);
  return {
    contentType: bufferToRawString(unpacked.contentType),
    content: unpacked.content,
    clusterId: unpacked.clusterId,
  };
}
