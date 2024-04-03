import { BIish, BI } from '@ckb-lumos/bi';
import { blockchain, Hash } from '@ckb-lumos/base';
import { BytesLike, createBytesCodec } from '@ckb-lumos/codec';
import { Uint64Opt, Uint8Opt } from './utils';

export interface PackableClusterProxyArgs {
  id: BytesLike;
  minPayment?: BIish;
}

export interface RawClusterProxyArgs {
  id: Hash;
  minPayment?: BI;
}

export const ClusterProxyArgsPower = createBytesCodec({
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

export const ClusterProxyArgsExact = createBytesCodec({
  pack(packable: PackableClusterProxyArgs): Uint8Array {
    const id = blockchain.Byte32.pack(packable.id);
    const minPayment = Uint64Opt.pack(packable.minPayment);

    const composed = new Uint8Array(id.length + minPayment.length);
    composed.set(id, 0);
    composed.set(minPayment, id.length);

    return composed;
  },
  unpack(unpackable: Uint8Array): RawClusterProxyArgs {
    const id = blockchain.Byte32.unpack(unpackable.slice(0, 32));
    const minPayment = Uint64Opt.unpack(unpackable.slice(32, 40));
    return {
      id,
      minPayment: typeof BI.isBI(minPayment) ? minPayment : void 0,
    };
  },
});

export function packRawClusterProxyArgs(packable: PackableClusterProxyArgs): Uint8Array;
export function packRawClusterProxyArgs(packable: PackableClusterProxyArgs, version: 'power'): Uint8Array;
export function packRawClusterProxyArgs(packable: PackableClusterProxyArgs, version: 'exact'): Uint8Array;
export function packRawClusterProxyArgs(packable: PackableClusterProxyArgs, version?: unknown): unknown {
  switch (version) {
    case 'power':
      return ClusterProxyArgsPower.pack(packable);
    case 'exact':
    case void 0:
      return ClusterProxyArgsExact.pack(packable);
    default:
      throw new Error(`Unsupported ClusterProxy version: ${version}`);
  }
}

export function unpackToRawClusterProxyArgs(unpackable: BytesLike): RawClusterProxyArgs;
export function unpackToRawClusterProxyArgs(unpackable: BytesLike, version: 'power'): RawClusterProxyArgs;
export function unpackToRawClusterProxyArgs(unpackable: BytesLike, version: 'exact'): RawClusterProxyArgs;
export function unpackToRawClusterProxyArgs(unpackable: BytesLike, version?: unknown): unknown {
  switch (version) {
    case 'power':
      return ClusterProxyArgsPower.unpack(unpackable);
    case 'exact':
    case void 0:
      return ClusterProxyArgsExact.unpack(unpackable);
    default:
      throw new Error(`Unsupported ClusterProxy version: ${version}`);
  }
}
