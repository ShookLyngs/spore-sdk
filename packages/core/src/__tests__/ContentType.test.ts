import { describe, it, expect } from 'vitest';
import { encodeContentType, decodeContentType, isContentTypeValid, setContentTypeParameters } from '../helpers';

describe('ContentType', function () {
  /**
   * Decode SporeData.contentType
   */
  it('Decode valid MIME', function () {
    const mimes: string[] = [
      'image/png',
      'image/png;immortal=true',
      'text/plain;mutant[]=000000000000000000000000000000000000000000000000000000000000000a',
      'text/plain;mutant[]="000000000000000000000000000000000000000000000000000000000000000a,000000000000000000000000000000000000000000000000000000000000000b"',
    ];

    for (const mime of mimes) {
      const isValid = isContentTypeValid(mime);
      expect(isValid).eq(true, `"${mime}" should be valid`);
    }
  });
  it('Decode invalid MIME', function () {
    const mimes: string[] = [
      'plain/;',
      'text',
      ';',
      '-',
      'plain/',
      'plain/test;;test=;',
      'plain/test;a=;;b=2',
      'text/plain;mutant[]=0xa,0xb',
      'text/plain;mutant[]="0xa,0xb"',
    ];

    for (const mime of mimes) {
      const isValid = isContentTypeValid(mime);
      expect(isValid).eq(false, `"${mime}" should be invalid`);
    }
  });
  it('Decode MIME with redundant parameters', function () {
    const t = decodeContentType('image/svg+xml;q=";";q=0.8');
    expect(t.parameters).toHaveProperty('q', ';');
  });
  it('Decode MIME with array but without quoted-string', function () {
    const t = decodeContentType(
      'text/plain;mutant[]=000000000000000000000000000000000000000000000000000000000000000a,000000000000000000000000000000000000000000000000000000000000000b',
    );
    expect(t.parameters).toHaveProperty('mutant', [
      '0x000000000000000000000000000000000000000000000000000000000000000a',
      '0x000000000000000000000000000000000000000000000000000000000000000b',
    ]);
  });

  /**
   * Encode SporeData.contentType
   */
  it('Encode normal MIME', function () {
    const t = encodeContentType({
      type: 'image',
      subtype: 'svg+xml',
      parameters: {
        immortal: true,
        q: 0.9,
      },
    });
    expect(t).toEqual('image/svg+xml;immortal=true;q=0.9');
  });
  it('Encode MIME with an array of mutants', function () {
    const t = encodeContentType({
      type: 'text',
      subtype: 'plain',
      parameters: {
        mutant: [
          '000000000000000000000000000000000000000000000000000000000000000a',
          '0x000000000000000000000000000000000000000000000000000000000000000b',
        ],
      },
    });
    expect(t).toEqual(
      'text/plain;mutant[]="000000000000000000000000000000000000000000000000000000000000000a,000000000000000000000000000000000000000000000000000000000000000b"',
    );
  });
  it('Encode MIME with non-array mutant', function () {
    const event = () =>
      encodeContentType({
        type: 'text',
        subtype: 'plain',
        parameters: {
          mutant: '0x000000000000000000000000000000000000000000000000000000000000000b',
        },
      });
    expect(event).toThrow();
  });
  it('Encode MIME with mutant, key name with []', function () {
    const t = encodeContentType({
      type: 'text',
      subtype: 'plain',
      parameters: {
        'mutant[]': ['0x000000000000000000000000000000000000000000000000000000000000000a'],
      },
    });
    expect(t).eq('text/plain;mutant[]=000000000000000000000000000000000000000000000000000000000000000a');
  });
  it('Update existing ContentType', () => {
    const type = setContentTypeParameters('text/plain;immortal=true', {
      mutant: [
        '000000000000000000000000000000000000000000000000000000000000000a',
        '0x000000000000000000000000000000000000000000000000000000000000000b',
      ],
    });
    expect(type).eq(
      'text/plain;immortal=true;mutant[]="000000000000000000000000000000000000000000000000000000000000000a,000000000000000000000000000000000000000000000000000000000000000b"',
    );
  });
});
