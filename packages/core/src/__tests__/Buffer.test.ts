import { bytes } from '@ckb-lumos/codec';
import { describe, expect, it } from 'vitest';
import { bufferToRawString, bytifyRawString } from '../helpers';

describe('Buffer', () => {
  it('Encode buffer from normal raw strings', () => {
    const strings = [
      { input: '\u0041', expected: 'A' },
      { input: '\u0100', expected: 'Ā' },
      { input: '\u304B', expected: 'か' },
      { input: '\uD800\uDF48', expected: '𐍈' },
      { input: '\uD83D\uDE0A', expected: '😊' },
    ];

    for (const raw of strings) {
      const decoded = bufferToRawString(bytifyRawString(raw.input));
      expect(decoded).toEqual(raw.expected);
    }
  });
  it('Encode buffer from special characters', () => {
    const strings = [
      { input: '\u0009', expected: '\t' },
      { input: '\u000A', expected: '\n' },
      { input: '\u0020', expected: ' ' },
    ];

    for (const raw of strings) {
      const decoded = bufferToRawString(bytifyRawString(raw.input));
      expect(decoded).toEqual(raw.expected);
    }
  });
  it('Encoded ascii & utf8 should be the same', () => {
    const raw = 'English';
    const utf8Encoded = bytes.hexify(bytifyRawString(raw));
    const asciiEncoded = bytes.hexify(bytes.bytifyRawString(raw));
    expect(utf8Encoded).toEqual(asciiEncoded);
  });
});
