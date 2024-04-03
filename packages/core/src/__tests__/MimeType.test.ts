import { describe, it, expect } from 'vitest';
import { parseMimeType, serializeMimeType } from '../helpers';

describe('ContentType', function () {
  /**
   * Parse MIME
   */
  it('Parse normal MIME', function () {
    const decoded = parseMimeType('image/png;immortal=true;ipfs="0x010aff15"');

    expect(decoded).not.toBeNull();
    expect(decoded!.parameters.get('immortal')).eq('true');
    expect(decoded!.parameters.get('ipfs')).eq('0x010aff15');
  });
  it('Parse MIME with unsupported array parameter', function () {
    const decoded = parseMimeType('image/png;mutant[]="a,b,c"');

    expect(decoded).not.toBeNull();
    expect(decoded!.parameters.has('mutant')).eq(false, 'mutant should not be in parameters');
  });
  it('Parse MIME with supported array parameter', function () {
    const decoded = parseMimeType('image/png;mutant[]="a,b,c"', {
      arrayParameters: true,
    });

    expect(decoded).not.toBeNull();
    expect(decoded!.parameters.get('mutant')).toEqual(['a', 'b', 'c']);
  });

  /**
   * Serialize MIME
   */
  it('Serialize normal MIME', function () {
    const serialized = serializeMimeType({
      type: 'image',
      subtype: 'svg+xml',
      parameters: new Map([
        ['immortal', 'true'],
        ['q', '0.9'],
      ]),
    });

    expect(serialized).toEqual('image/svg+xml;immortal=true;q=0.9');
  });
  it('Serialize MIME with unsupported array parameter', function () {
    expect(() =>
      serializeMimeType({
        type: 'text',
        subtype: 'plain',
        parameters: new Map([['mutant', ['a', 'b', 'c']]]),
      }),
    ).toThrow('Array parameter value is not supported');
  });
  it('Serialize MIME with supported array parameter', function () {
    const serialized = serializeMimeType(
      {
        type: 'image',
        subtype: 'svg+xml',
        parameters: new Map([['mutant', ['a', 'b', 'c']]]),
      },
      {
        arrayParameters: true,
      },
    );

    expect(serialized).toEqual('image/svg+xml;mutant[]="a,b,c"');
  });
});
