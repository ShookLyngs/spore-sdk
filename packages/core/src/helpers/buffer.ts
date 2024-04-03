import { bytes, BytesLike } from '@ckb-lumos/codec';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytifyRawString(text: string): Uint8Array {
  return encoder.encode(text);
}

export function bufferToRawString(source: BytesLike, options?: TextDecodeOptions): string {
  const buffer = bytes.bytify(source);
  return decoder.decode(buffer, options);
}
