import { Decoder } from '../helper';

const TESTNET_DECODERS = {
  DOB0: {
    code_hash: {
      type: 'code_hash',
      hash: '0x13cac78ad8482202f18f9df4ea707611c35f994375fa03ae79121312dda9925c',
    },
    type_id: null,
    type_script: null,
  },
  DOB1: {
    code_hash: {
      type: 'code_hash',
      hash: '0xda3525549b72970b4c95f5b5749357f20d1293d335710b674f09c32f7d54b6dc',
    },
    type_id: {
      type: 'type_id',
      hash: '0x784e32cef202b9d4759ea96e80d806f94051e8069fd34d761f452553700138d7',
    },
    type_script: {
      type: 'type_script',
      script: {
        codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
        hashType: 'type',
        args: '0x784e32cef202b9d4759ea96e80d806f94051e8069fd34d761f452553700138d7',
      },
    },
  },
};

const MAINNET_DECODERS = {
  DOB0: {
    code_hash: {
      type: 'code_hash',
      hash: '0x13cac78ad8482202f18f9df4ea707611c35f994375fa03ae79121312dda9925c',
    },
    type_id: null,
    type_script: null,
  },
  DOB1: {
    code_hash: {
      type: 'code_hash',
      hash: '0xda3525549b72970b4c95f5b5749357f20d1293d335710b674f09c32f7d54b6dc',
    },
    type_id: {
      type: 'type_id',
      hash: '0x8892bea4405a1f077921799bc0f4516e0ebaef7aea0dfc6614a8898fb47d5372',
    },
    type_script: {
      type: 'type_script',
      script: {
        codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
        hashType: 'type',
        args: '0x8892bea4405a1f077921799bc0f4516e0ebaef7aea0dfc6614a8898fb47d5372',
      },
    },
  },
};

export function getTestnetDecoder(
  dobVersion: 'DOB0' | 'DOB1',
  locationType: 'code_hash' | 'type_id' | 'type_script',
): Decoder {
  const decoder = TESTNET_DECODERS[dobVersion][locationType];
  if (decoder === null) {
    throw new Error(`Invalid decoder: ${dobVersion} does not support ${locationType}`);
  }
  return decoder as Decoder;
}

export function getMainnetDecoder(
  dobVersion: 'DOB0' | 'DOB1',
  locationType: 'code_hash' | 'type_id' | 'type_script',
): Decoder {
  const decoder = MAINNET_DECODERS[dobVersion][locationType];
  if (decoder === null) {
    throw new Error(`Invalid decoder: ${dobVersion} does not support ${locationType}`);
  }
  return decoder as Decoder;
}
