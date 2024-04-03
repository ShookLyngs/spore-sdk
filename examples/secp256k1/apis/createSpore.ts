import { resolve } from 'path';
import { readFileSync } from 'fs';
import { createSpore } from '@spore-sdk/core';
import { accounts, config } from '../utils/config';

/**
 * Fetch local image file as Uint8Array in Node.
 * In browser, you can use fetch() to fetch remote image file as Uint8Array.
 */
export async function fetchLocalImage(src: string): Promise<Uint8Array> {
  const buffer = readFileSync(resolve(__dirname, src));
  return new Uint8Array(buffer);
}

(async function main() {
  const { CHARLIE } = accounts;

  const { txSkeleton, outputIndex } = await createSpore({
    data: {
      /**
       * The Spore's content type (MIME type), e.g. 'text/plain', 'image/jpeg', 'application/json', etc.
       * You can search for the full list of MIME types on the Internet:
       * https://www.iana.org/assignments/media-types/media-types.xhtml
       */
      contentType: 'image/jpeg',
      /**
       * The Spore's content, should be a BytesLike type object, e.g. Uint8Array, ArrayBuffer, etc.
       * You can use bytifyRawString() to convert a string to Uint8Array if needed.
       */
      content: await fetchLocalImage('../../shared/test.jpg'),
    },
    fromInfos: [CHARLIE.address],
    toLock: CHARLIE.lock,
    config,
  });

  const hash = await CHARLIE.signAndSendTransaction(txSkeleton);
  console.log('createSpore transaction sent, hash:', hash);
  console.log('Spore output index:', outputIndex);

  const sporeCell = txSkeleton.get('outputs').get(outputIndex)!;
  console.log('Spore ID:', sporeCell.cellOutput.type!.args);
})();
