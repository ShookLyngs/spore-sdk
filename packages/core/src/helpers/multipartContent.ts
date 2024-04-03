import { bytes, BytesLike } from '@ckb-lumos/codec';
import parseMultipartMessage, { encodeMultipartMessage } from '@exact-realty/multipart-parser';
import { TDecodedMultipartMessage } from '@exact-realty/multipart-parser/dist/encodeMultipartMessage';
import { TMultipartMessageGenerator } from '@exact-realty/multipart-parser/dist/parseMultipartMessage';
import { TTypedArray } from '@exact-realty/multipart-parser/dist/types';
import { bufferToRawString, bytifyRawString } from './buffer';

export type AsyncableIterable<T> = AsyncIterable<T> | Iterable<T>;

export type ResolvedMultipartContent = {
  headers: Headers;
  body?: Uint8Array | null;
  parts?: ResolvedMultipartContent[] | null;
};

export async function decodeMultipartContent(message: string, boundary: string): Promise<ResolvedMultipartContent[]> {
  const buf = bytifyRawString(replaceNewLineToCRLF(message));
  return decodeMultipartContentFromBytes(buf, boundary);
}

export async function decodeMultipartContentFromBytes(
  buf: BytesLike,
  boundary: string,
): Promise<ResolvedMultipartContent[]> {
  const stream = new Blob([bytes.bytify(buf)]).stream();
  return decodeMultipartContentFromStream(stream, boundary);
}

export async function decodeMultipartContentFromStream<T extends TTypedArray>(
  stream: ReadableStream<T>,
  boundary: string,
): Promise<ResolvedMultipartContent[]> {
  async function parseMimeRecursively(messages: TMultipartMessageGenerator): Promise<ResolvedMultipartContent[]> {
    const chunks: ResolvedMultipartContent[] = [];
    for await (const chunk of messages) {
      if (chunk.parts) {
        const parts = await parseMimeRecursively(chunk.parts);
        chunks.push({
          ...chunk,
          parts,
        });
      } else {
        chunks.push({
          headers: chunk.headers,
          body: chunk.body,
        });
      }
    }

    return chunks;
  }

  const firstLayer = parseMultipartMessage(stream, boundary);
  return parseMimeRecursively(firstLayer);
}

export async function encodeMultipartContent(
  boundary: string,
  message: AsyncableIterable<TDecodedMultipartMessage>,
): Promise<{
  stream: ReadableStream<ArrayBuffer>;
  buffer: ArrayBuffer;
  bufferChunks: ArrayBuffer[];
  rawStringChunks: string[];
  byteLength: number;
  codeUnitLength: number;
}> {
  const stream = encodeMultipartMessage(boundary, message);
  const result = await readArrayBufferStream(stream);

  return {
    stream,
    ...result,
  };
}

export async function readArrayBufferStream(stream: ReadableStream<ArrayBuffer>): Promise<{
  buffer: ArrayBuffer;
  bufferChunks: ArrayBuffer[];
  rawStringChunks: string[];
  byteLength: number;
  codeUnitLength: number;
}> {
  const reader = stream.getReader();

  const bufferChunks: ArrayBuffer[] = [];
  const rawStringChunks: string[] = [];
  let codeUnitLength = 0;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }

    bufferChunks.push(chunk.value);

    const rawString = bufferToRawString(chunk.value);
    codeUnitLength += rawString.length;
    rawStringChunks.push(rawString);
  }

  const buffer = await new Blob(bufferChunks).arrayBuffer();
  const byteLength = buffer.byteLength;

  return {
    buffer,
    bufferChunks,
    rawStringChunks,
    byteLength,
    codeUnitLength,
  };
}

export async function isMultipartContentValid(message: string, boundary: string): Promise<boolean> {
  try {
    await decodeMultipartContent(message, boundary);
    return true;
  } catch {
    return false;
  }
}

export async function isMultipartContentAsBytesValid(buf: BytesLike, boundary: string): Promise<boolean> {
  try {
    await decodeMultipartContentFromBytes(buf, boundary);
    return true;
  } catch {
    return false;
  }
}

function replaceNewLineToCRLF(str: string) {
  return str.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
}
