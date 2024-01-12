import MimeType from 'whatwg-mimetype';
// @ts-ignore
import parseMime from 'whatwg-mimetype/lib/parser';
// @ts-ignore
import serializeMime from 'whatwg-mimetype/lib/serializer';

export interface EncodableContentType {
  type: string;
  subtype: string;
  parameters: Record<string, any>;
}

export interface DecodedContentType {
  type: string;
  subtype: string;
  mediaType: string;
  parameters: Record<string, string>;
}

/**
 * Check if the target ContentType's format is valid.
 * The function simply checks that the MIME format is valid,
 * it does not check the existence of type, subtype, or parameters.
 *
 * - A typical MIME example: "image/jpeg".
 * - A more complex example: "image/svg+xml;q=0.9,/;q=0.8".
 */
export function isContentTypeValid(contentType: string): boolean {
  try {
    const encoded = new MimeType(contentType);
    return encoded.toString() === contentType;
  } catch {
    return false;
  }
}

/**
 * Convert ContentType object to string.
 */
export function encodeContentType(contentType: EncodableContentType): string {
  try {
    return serializeMime({
      type: contentType.type,
      subtype: contentType.subtype,
      parameters: Object.entries(contentType.parameters),
    });
  } catch {
    throw new Error('Cannot encode ContentType');
  }
}

/**
 * Convert ContentType string to object.
 */
export function decodeContentType(contentType: string): DecodedContentType {
  try {
    const decoded = parseMime(contentType);
    return {
      type: decoded.type,
      subtype: decoded.subtype,
      mediaType: `${decoded.type}/${decoded.subtype}`,
      parameters: Object.fromEntries(decoded.parameters),
    };
  } catch {
    throw new Error(`Cannot decode ContentType "${contentType}"`);
  }
}

/**
 * Update the parameters of a content type string.
 * Note the function may change the order the provided content type.
 *
 * An example:
 * ```typescript
 * setContentTypeParameters('image/jpeg;a=1;b=2', { a: '3' }); // image/jpeg;a=3;b=2
 * ```
 */
export function setContentTypeParameters(contentType: string, parameters: Record<string, any>) {
  const decoded = decodeContentType(contentType);
  for (const [key, value] of Object.entries(parameters)) {
    decoded.parameters[key] = value;
  }

  return encodeContentType(decoded);
}
