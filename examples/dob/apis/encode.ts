import {
  Dob0,
  Dob1,
  encodeClusterDescriptionForDob0,
  encodeClusterDescriptionForDob1,
  getTestnetDecoder,
  PatternElementDob0,
  PatternElementDob1,
} from '@spore-sdk/dob';

(async function main() {
  /**
   * Generation example for DOB0
   */
  const clusterDescription = 'My First DOB0 Cluster';
  const dob0Pattern: PatternElementDob0[] = [
    {
      traitName: 'BackgroundColor',
      dobType: 'String',
      dnaOffset: 0,
      dnaLength: 1,
      patternType: 'options',
      traitArgs: ['red', 'blue', 'green', 'black', 'white'],
    },
    {
      traitName: 'FontSize',
      dobType: 'Number',
      dnaOffset: 1,
      dnaLength: 1,
      patternType: 'range',
      traitArgs: [10, 50],
    },
    {
      traitName: 'FontFamily',
      dobType: 'String',
      dnaOffset: 2,
      dnaLength: 1,
      patternType: 'options',
      traitArgs: ['Arial', 'Helvetica', 'Times New Roman', 'Courier New'],
    },
    {
      traitName: 'Timestamp',
      dobType: 'Number',
      dnaOffset: 3,
      dnaLength: 4,
      patternType: 'rawNumber',
    },
    {
      traitName: 'ConsoleLog',
      dobType: 'String',
      dnaOffset: 7,
      dnaLength: 13,
      patternType: 'utf8',
    },
  ];
  const dob0: Dob0 = {
    description: clusterDescription,
    dob: {
      ver: 0,
      decoder: getTestnetDecoder('DOB0', 'code_hash')!,
      pattern: dob0Pattern,
    },
  };
  const dob0ClusterDescription = encodeClusterDescriptionForDob0(dob0);
  console.log('dob0 =', dob0ClusterDescription);

  /**
   * Generation example for DOB1
   */
  const dob1Pattern: PatternElementDob1[] = [
    {
      imageName: 'IMAGE.0',
      svgFields: 'attributes',
      traitName: '',
      patternType: 'raw',
      traitArgs: "xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'",
    },
    {
      imageName: 'IMAGE.0',
      svgFields: 'elements',
      traitName: 'Timestamp',
      patternType: 'options',
      traitArgs: [
        [
          [0, 1000000],
          "<image width='300' height='200' href='btcfs://b2f4560f17679d3e3fca66209ac425c660d28a252ef72444c3325c6eb0364393i0' />",
        ],
        [
          ['*'],
          "<image width='300' height='200' btcfs://eb3910b3e32a5ed9460bd0d75168c01ba1b8f00cc0faf83e4d8b67b48ea79676i0 />",
        ],
      ],
    },
    {
      imageName: 'IMAGE.0',
      svgFields: 'elements',
      traitName: 'BackgroundColor',
      patternType: 'options',
      traitArgs: [
        ['red', "<rect width='20' height='20' x='5' y='5' fill='red' />"],
        ['blud', "<rect width='20' height='20' x='20' y='5' fill='blue' />"],
        ['green', "<rect width='20' height='20' x='5' y='20' fill='green' />"],
        [['*'], "<rect width='20' height='20' x='20' y='20' fill='pink' />"],
      ],
    },
    {
      imageName: 'IMAGE.0',
      svgFields: 'elements',
      traitName: 'ConsoleLog',
      patternType: 'options',
      traitArgs: [
        [
          'hello, world!',
          "<image width='100' height='100' href='ipfs://QmeQ6TfqzsjJCMtYmpbyZeMxiSzQGc6Aqg6NyJTeLYrrJr' />",
        ],
        [['*'], "<image width='100' height='100' href='ipfs://QmYiiN8EXxAnyddatCbXRYzwU9wwAjh21ms4KEJodxg8Fo' />"],
      ],
    },
  ];
  const dob1: Dob1 = {
    description: clusterDescription,
    dob: {
      ver: 1,
      decoders: [
        {
          decoder: getTestnetDecoder('DOB0', 'code_hash'),
          pattern: dob0Pattern,
        },
        {
          decoder: getTestnetDecoder('DOB1', 'type_script'),
          pattern: dob1Pattern,
        },
      ],
    },
  };
  const dob1ClusterDescription = encodeClusterDescriptionForDob1(dob1);
  console.log('dob1 =', dob1ClusterDescription);
})();
