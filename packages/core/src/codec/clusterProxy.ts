import { BIish, BI } from '@ckb-lumos/bi';
import { blockchain, Hash } from '@ckb-lumos/base';
import { BytesLike, createBytesCodec } from '@ckb-lumos/codec';
import { Uint8Opt } from './utils';

export interface PackableClusterProxyArgs {
  id: BytesLike;
  minPayment?: BIish;
}

export interface RawClusterProxyArgs {
  id: Hash;
  minPayment?: BI;
}

export const ClusterProxyArgs = createBytesCodec({
  pack(packable: PackableClusterProxyArgs): Uint8Array {
    const id = blockchain.Byte32.pack(packable.id);
    const minPayment = Uint8Opt.pack(packable.minPayment);

    const composed = new Uint8Array(id.length + minPayment.length);
    composed.set(id, 0);
    composed.set(minPayment, id.length);

    return composed;
  },
  unpack(unpackable: Uint8Array): RawClusterProxyArgs {
    const id = blockchain.Byte32.unpack(unpackable.slice(0, 32));
    const minPayment = Uint8Opt.unpack(unpackable.slice(32, 33));
    return {
      id,
      minPayment: typeof minPayment === 'number' ? BI.from(minPayment) : void 0,
    };
  },
});

export function packRawClusterProxyArgs(packable: PackableClusterProxyArgs): Uint8Array {
  return ClusterProxyArgs.pack(packable);
}

export function unpackToRawClusterProxyArgs(unpackable: BytesLike): RawClusterProxyArgs {
  return ClusterProxyArgs.unpack(unpackable);
}
