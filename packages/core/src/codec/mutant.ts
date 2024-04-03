import { BIish, BI } from '@ckb-lumos/bi';
import { blockchain, Hash } from '@ckb-lumos/base';
import { BytesLike, createBytesCodec } from '@ckb-lumos/codec';
import { Uint64Opt, Uint8Opt } from './utils';

export interface PackableMutantArgs {
  id: BytesLike;
  minPayment?: BIish;
}

export interface RawMutantArgs {
  id: Hash;
  minPayment?: BI;
}

export const MutantArgsPower = createBytesCodec({
  pack(packable: PackableMutantArgs): Uint8Array {
    const id = blockchain.Byte32.pack(packable.id);
    const minPayment = Uint8Opt.pack(packable.minPayment);

    const composed = new Uint8Array(id.length + minPayment.length);
    composed.set(id, 0);
    composed.set(minPayment, id.length);

    return composed;
  },
  unpack(unpackable: Uint8Array): RawMutantArgs {
    const id = blockchain.Byte32.unpack(unpackable.slice(0, 32));
    const minPayment = Uint8Opt.unpack(unpackable.slice(32, 33));
    return {
      id,
      minPayment: typeof minPayment === 'number' ? BI.from(minPayment) : void 0,
    };
  },
});

export const MutantArgsExact = createBytesCodec({
  pack(packable: PackableMutantArgs): Uint8Array {
    const id = blockchain.Byte32.pack(packable.id);
    const minPayment = Uint64Opt.pack(packable.minPayment);

    const composed = new Uint8Array(id.length + minPayment.length);
    composed.set(id, 0);
    composed.set(minPayment, id.length);

    return composed;
  },
  unpack(unpackable: Uint8Array): RawMutantArgs {
    const id = blockchain.Byte32.unpack(unpackable.slice(0, 32));
    const minPayment = Uint64Opt.unpack(unpackable.slice(32, 40));
    return {
      id,
      minPayment: typeof BI.isBI(minPayment) ? minPayment : void 0,
    };
  },
});

export function packRawMutantArgs(packable: PackableMutantArgs): Uint8Array;
export function packRawMutantArgs(packable: PackableMutantArgs, version: 'power'): Uint8Array;
export function packRawMutantArgs(packable: PackableMutantArgs, version: 'exact'): Uint8Array;
export function packRawMutantArgs(packable: PackableMutantArgs, version?: unknown): unknown {
  switch (version) {
    case 'power':
      return MutantArgsPower.pack(packable);
    case 'exact':
    case void 0:
      return MutantArgsExact.pack(packable);
    default:
      throw new Error(`Unsupported Mutant version: ${version}`);
  }
}

export function unpackToRawMutantArgs(unpackable: BytesLike): RawMutantArgs;
export function unpackToRawMutantArgs(unpackable: BytesLike, version: 'power'): RawMutantArgs;
export function unpackToRawMutantArgs(unpackable: BytesLike, version: 'exact'): RawMutantArgs;
export function unpackToRawMutantArgs(unpackable: BytesLike, version?: unknown): unknown {
  switch (version) {
    case 'power':
      return MutantArgsPower.unpack(unpackable);
    case 'exact':
    case void 0:
      return MutantArgsExact.unpack(unpackable);
    default:
      throw new Error(`Unsupported Mutant version: ${version}`);
  }
}
