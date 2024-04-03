/**
 * Copyright © Domenic Denicola <d@domenic.me>
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * A MIME parser/serializer module, extended from the @jsdom/whatwg-mimetype library.
 * Visit source code on GitHub: https://github.com/jsdom/whatwg-mimetype
 */

export interface MimeType {
  type: string;
  subtype: string;
  parameters: Map<string, string | string[]>;
}

export interface MimeTypeOptions {
  arrayParameters?: boolean;
}

/**
 * Convert MIME string to MimeType object.
 * @example
 * parseMimeType('image/svg+xml;q=";";q=0.8')
 * // {
 * //  type: 'image',
 * //  subtype: 'svg+xml',
 * //  parameters: Map(1) { 'q' => ';' },
 * // }
 */
export function parseMimeType(input: string, options?: MimeTypeOptions): MimeType | null {
  const supportArray = options?.arrayParameters ?? false;

  input = removeLeadingAndTrailingHTTPWhitespace(input);

  let position = 0;
  let type = '';
  while (position < input.length && input[position] !== '/') {
    type += input[position];
    ++position;
  }

  if (type.length === 0 || !solelyContainsHTTPTokenCodePoints(type)) {
    return null;
  }

  if (position >= input.length) {
    return null;
  }

  // Skips past "/"
  ++position;

  let subtype = '';
  while (position < input.length && input[position] !== ';') {
    subtype += input[position];
    ++position;
  }

  subtype = removeTrailingHTTPWhitespace(subtype);

  if (subtype.length === 0 || !solelyContainsHTTPTokenCodePoints(subtype)) {
    return null;
  }

  const mimeType = {
    type: asciiLowercase(type),
    subtype: asciiLowercase(subtype),
    parameters: new Map<string, string | string[]>(),
  };

  while (position < input.length) {
    // Skip past ";"
    ++position;

    while (isHTTPWhitespaceChar(input[position])) {
      ++position;
    }

    let parameterName = '';
    while (position < input.length && input[position] !== ';' && input[position] !== '=') {
      parameterName += input[position];
      ++position;
    }
    parameterName = asciiLowercase(parameterName);

    if (position < input.length) {
      if (input[position] === ';') {
        continue;
      }

      // Skip past "="
      ++position;
    }

    let parameterValue = null;
    if (input[position] === '"') {
      [parameterValue, position] = collectAnHTTPQuotedString(input, position);

      while (position < input.length && input[position] !== ';') {
        ++position;
      }
    } else {
      parameterValue = '';
      while (position < input.length && input[position] !== ';') {
        parameterValue += input[position];
        ++position;
      }

      parameterValue = removeTrailingHTTPWhitespace(parameterValue);

      if (parameterValue === '') {
        continue;
      }
    }

    const parameterNameNotEmpty = parameterName.length > 0;
    const parameterNameSuggestArray = parameterName.endsWith('[]');
    if (!parameterNameNotEmpty || (parameterNameSuggestArray && !supportArray)) {
      continue;
    }

    // Remove the sign of Array types.
    // For example, "a[]" -> "a".
    const performArrayMode = parameterNameNotEmpty && parameterNameSuggestArray && supportArray;
    if (performArrayMode) {
      parameterName = parameterName.slice(0, -2);
    }

    const parameterIsNew = !mimeType.parameters.has(parameterName);
    const parameterNameInRange = solelyContainsHTTPTokenCodePoints(parameterName);
    const parameterValueInRange = solelyContainsHTTPQuotedStringTokenCodePoints(parameterValue);
    if (parameterNameNotEmpty && parameterNameInRange && parameterValueInRange && parameterIsNew) {
      // Convert String type parameter value to Array.
      // For example, "1,2,3" -> ['1', '2', '3'].
      if (performArrayMode) {
        parameterValue = parameterValue.split(',');
      }

      mimeType.parameters.set(parameterName, parameterValue);
    }
  }

  return mimeType;
}

/**
 * Convert MIME string to MimeType object.
 * @example
 * parseMimeType({
 *   type: 'image',
 *   subtype: 'svg+xml',
 *   parameters: new Map([
 *     ['a', '1'],
 *     ['b', '2'],
 *   ]),
 * })
 * // image/svg+xml;a=1;b=2
 */
export function serializeMimeType(mimeType: MimeType, options?: MimeTypeOptions): string {
  const supportArray = options?.arrayParameters ?? false;

  let serialization = `${mimeType.type}/${mimeType.subtype}`;

  if (mimeType.parameters.size === 0) {
    return serialization;
  }

  for (let [name, value] of mimeType.parameters) {
    if (!supportArray && Array.isArray(value)) {
      throw new Error('Array parameter value is not supported');
    }
    if (Array.isArray(value)) {
      name = !name.endsWith('[]') ? `${name}[]` : name;
      value = (value as string[]).join(',');
    }

    serialization += ';';
    serialization += name;
    serialization += '=';

    if (!solelyContainsHTTPTokenCodePoints(value) || value.length === 0) {
      value = value.replace(/(["\\])/gu, '\\$1');
      value = `"${value}"`;
    }

    serialization += value;
  }

  return serialization;
}

export function removeLeadingAndTrailingHTTPWhitespace(string: string): string {
  return string.replace(/^[ \t\n\r]+/u, '').replace(/[ \t\n\r]+$/u, '');
}

export function removeTrailingHTTPWhitespace(string: string): string {
  return string.replace(/[ \t\n\r]+$/u, '');
}

export function isHTTPWhitespaceChar(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

export function solelyContainsHTTPTokenCodePoints(string: string): boolean {
  return /^[-!#$%&'*+.^_`|~A-Za-z0-9]*$/u.test(string);
}

// Extends from the "solelyContainsHTTPTokenCodePoints()" function.
// Supports additional "[]" characters.
export function solelyContainsExtendedHTTPTokenCodePoints(string: string): boolean {
  return /^[-!#$%&'*+.^_`|~\[\]A-Za-z0-9]*$/u.test(string);
}

export function solelyContainsHTTPQuotedStringTokenCodePoints(string: string): boolean {
  return /^[\t\u0020-\u007E\u0080-\u00FF]*$/u.test(string);
}

export function asciiLowercase(string: string) {
  return string.replace(/[A-Z]/gu, (l) => l.toLowerCase());
}

// This variant only implements it with the extract-value flag set.
export function collectAnHTTPQuotedString(input: string, position: number): [string, number] {
  let value = '';

  position++;

  while (true) {
    while (position < input.length && input[position] !== '"' && input[position] !== '\\') {
      value += input[position];
      ++position;
    }

    if (position >= input.length) {
      break;
    }

    const quoteOrBackslash = input[position];
    ++position;

    if (quoteOrBackslash === '\\') {
      if (position >= input.length) {
        value += '\\';
        break;
      }

      value += input[position];
      ++position;
    } else {
      break;
    }
  }

  return [value, position];
}
