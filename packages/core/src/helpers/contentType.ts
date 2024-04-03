import { MimeType, parseMimeType, serializeMimeType } from './mimeType';

export interface EncodableContentType {
  type: string;
  subtype: string;
  parameters?: Record<string, any>;
}

export interface DecodedContentType {
  type: string;
  subtype: string;
  mediaType: string;
  parameters: Record<string, string | string[]>;
}

/**
 * Check if the target ContentType's format is valid.
 * - A typical MIME example: "image/jpeg".
 * - A more complex example: "image/svg+xml;q=0.9,/;q=0.8".
 */
export function isContentTypeValid(contentType: string): boolean {
  try {
    const decoded = decodeContentType(contentType);
    const encoded = encodeContentType(decoded);
    return encoded === contentType;
  } catch {
    return false;
  }
}

/**
 * Convert ContentType object to string.
 *
 * @example
 * encodeContentType({
 *   type: 'image',
 *   subtype: 'svg+xml',
 *   parameters: {
 *     a: 1,
 *     b: 2,
 *   },
 * })
 * // image/svg+xml;a=1;b=2
 */
export function encodeContentType(encodable: EncodableContentType): string {
  const originalParameters = Object.entries(encodable.parameters || {});
  const parameters: [string, string | string[]][] = originalParameters.map(([key, value]) => {
    if (key === 'mutant' || key === 'mutant[]') {
      [key, value] = encodeMutantParameter(key, value);
    }
    if (Array.isArray(value)) {
      value = value.map((row, index) => {
        if (typeof row !== 'string') {
          if (!(row['toString'] instanceof Function)) {
            throw new Error(`ContentType parameter "${key}" has a property that cannot be converted to string`);
          }
          row = row.toString();
        }
        return row;
      });
    }
    if (!Array.isArray(value) && typeof value !== 'string') {
      if (!(value['toString'] instanceof Function)) {
        throw new Error(`ContentType parameter "${key}" cannot be converted to string`);
      }
      value = value.toString();
    }

    return [key, value];
  });

  return serializeMimeType(
    {
      type: encodable.type,
      subtype: encodable.subtype,
      parameters: new Map(parameters),
    },
    {
      arrayParameters: true,
    },
  );
}

/**
 * Convert ContentType from string to object.
 *
 * @example
 * decodeContentType('image/svg+xml;a=1;b=2')
 * // {
 * //  type: 'image',
 * //  subtype: 'svg+xml',
 * //  mediaType: 'image/svg+xml',
 * //  parameters: { a: '1', b: '2' },
 * // }
 */
export function decodeContentType(contentType: string): DecodedContentType {
  let decoded: MimeType | null = null;
  try {
    decoded = parseMimeType(contentType, {
      arrayParameters: true,
    });
  } catch {
    // The error will be handled later
  }
  if (!decoded) {
    throw new Error(`Cannot decode ContentType: ${contentType}`);
  }

  const parameters = Object.fromEntries(decoded.parameters);
  if (parameters.mutant && Array.isArray(parameters.mutant)) {
    parameters.mutant = parameters.mutant.map((row: string) => {
      return !row.startsWith('0x') ? '0x' + row : row;
    });
  }

  return {
    type: decoded.type,
    subtype: decoded.subtype,
    mediaType: `${decoded.type}/${decoded.subtype}`,
    parameters,
  };
}

/**
 * Update the parameters of a content type string.
 * Note the function may change the order of the provided content type.
 *
 * @example
 * setContentTypeParameters('image/jpeg;a=1;b=2', { a: '3' });
 * // image/jpeg;a=3;b=2
 */
export function setContentTypeParameters(contentType: string, parameters: Record<string, any>): string {
  const decoded = decodeContentType(contentType);
  for (const [key, value] of Object.entries(parameters)) {
    decoded.parameters[key] = value;
  }

  return encodeContentType(decoded);
}

/**
 * Validate and convert parameters['mutant'] of ContentType to acceptable format.
 */
export function encodeMutantParameter(key: string, value: any[]): [string, string[]] {
  if (key === 'mutant[]') {
    key = 'mutant';
  }

  if (!Array.isArray(value)) {
    throw new Error(`ContentType parameter mutant should be an array`);
  }
  value = value.map((row, index) => {
    if (typeof row !== 'string') {
      if (!(row['toString'] instanceof Function)) {
        throw new Error(`ContentType parameter "${key}" has a property that cannot be converted to string`);
      }
      row = row.toString();
    }
    if (row.startsWith('0x')) {
      row = row.slice(2);
    }
    if (row.length !== 64) {
      throw new Error(`ContentType parameter mutant[${index}] should have a length of 32 bytes: ${row}`);
    }

    return row;
  });

  return [key, value];
}
