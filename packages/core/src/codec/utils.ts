import { blockchain } from '@ckb-lumos/base';
import { BytesLike, molecule, number } from '@ckb-lumos/codec';
import { bufferToRawString, bytifyRawString } from '../helpers';

export const ScriptId = molecule.struct(
  {
    codeHash: blockchain.Byte32,
    hashType: blockchain.HashType,
  },
  ['codeHash', 'hashType'],
);

export const Uint8Opt = molecule.option(number.Uint8);
export const Uint32Opt = molecule.option(number.Uint32LE);
export const Uint64Opt = molecule.option(number.Uint64LE);

export const Hash = blockchain.Byte32;

/**
 * The codec for packing/unpacking UTF-8 raw strings.
 * Should be packed like so: String.pack('something')
 */
export const RawString = molecule.byteVecOf({
  pack: (packable: string) => bytifyRawString(packable),
  unpack: (unpackable: BytesLike) => bufferToRawString(unpackable),
});
