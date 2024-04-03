import { resolve } from 'path';
import { readFileSync } from 'fs';
import { bytes } from '@ckb-lumos/codec';
import { HexString } from '@ckb-lumos/lumos';
import { bytifyRawString } from '../../helpers';

export async function fetchLocalFile(
  src: string,
  relativePath?: string,
): Promise<{
  bytes: ArrayBuffer;
  hex: HexString;
}> {
  const buffer = readFileSync(resolve(relativePath ?? __dirname, src));
  const uint8Array = new Uint8Array(buffer);
  return {
    bytes: uint8Array,
    hex: bytes.hexify(uint8Array),
  };
}

export async function fetchLocalImage(
  src: string,
  relativePath?: string,
): Promise<{
  arrayBuffer: ArrayBuffer;
  arrayBufferHex: HexString;
  base64: string;
  base64Hex: HexString;
}> {
  const buffer = readFileSync(resolve(relativePath ?? __dirname, src));
  const arrayBuffer = new Uint8Array(buffer).buffer;
  const base64 = buffer.toString('base64');
  return {
    base64,
    arrayBuffer,
    arrayBufferHex: bytes.hexify(arrayBuffer),
    base64Hex: bytes.hexify(bytifyRawString(base64)),
  };
}
