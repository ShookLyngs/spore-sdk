import { describe, expect, it } from 'vitest';
import { bytes } from '@ckb-lumos/codec';
import { BI, HexString } from '@ckb-lumos/lumos';
import { bytifyRawString } from '../helpers';
import { packRawSporeData, unpackToRawSporeData, RawSporeData, RawString } from '../codec';
import { packRawClusterData, unpackToRawClusterData, RawClusterData } from '../codec';
import { packRawClusterProxyArgs, unpackToRawClusterProxyArgs, RawClusterProxyArgs } from '../codec';
import { packRawClusterAgentDataToHash, RawClusterAgentData } from '../codec';

interface PackableTest<T> {
  packable: T;
  packed: HexString;
}

describe('Codec', function () {
  /**
   * RawString
   */
  it('Encode via RawString codec', () => {
    expect(RawString.pack('content')).toEqual(bytes.bytify('0x07000000636f6e74656e74'));
    expect(RawString.unpack('0x07000000636f6e74656e74')).toEqual('content');
  });

  /**
   * SporeData
   */
  const sporeDataTests: PackableTest<RawSporeData>[] = [
    {
      packable: {
        contentType: 'text/plain',
        content: bytifyRawString('testing plain text'),
        clusterId: '0x21a30f2b2f4927dbd6fd3917990af0dbb868438f44184e84d515f9af84ae4861',
      },
      packed:
        '0x58000000100000001e000000340000000a000000746578742f706c61696e1200000074657374696e6720706c61696e20746578742000000021a30f2b2f4927dbd6fd3917990af0dbb868438f44184e84d515f9af84ae4861',
    },
    {
      packable: {
        contentType: 'text/plain',
        content: bytifyRawString('testing plain text'),
      },
      packed:
        '0x34000000100000001e000000340000000a000000746578742f706c61696e1200000074657374696e6720706c61696e2074657874',
    },
  ];
  it('Pack SporeData', function () {
    for (let i = 0; i < sporeDataTests.length; i++) {
      const test = sporeDataTests[i];
      const packed = packRawSporeData(test.packable);
      const packedHex = bytes.hexify(packed);
      expect(packedHex).eq(test.packed, `SporeData in test #${i} should be packable`);
    }
  });
  it('Unpack SporeData', function () {
    for (let i = 0; i < sporeDataTests.length; i++) {
      const test = sporeDataTests[i];
      const unpacked = unpackToRawSporeData(test.packed);

      // SporeData.content
      expect(bytes.equal(unpacked.content, test.packable.content)).eq(
        true,
        `SporeData.content in test #${i} should be unpackable`,
      );

      // SporeData.contentType
      expect(unpacked.contentType).eq(
        test.packable.contentType,
        `SporeData.contentType in test #${i} should be unpackable`,
      );

      // SporeData.clusterId
      if (test.packable.clusterId !== void 0) {
        expect(unpacked.clusterId).toBeDefined();

        const unpackedClusterId = bytes.bytify(unpacked.clusterId!);
        const packableClusterId = bytes.bytify(test.packable.clusterId!);
        expect(bytes.equal(unpackedClusterId, packableClusterId)).eq(
          true,
          `SporeData.clusterId in test #${i} should be unpackable`,
        );
      } else {
        expect(unpacked.clusterId).toBeUndefined();
      }
    }
  });

  /**
   * ClusterData
   */
  const clusterDataTests: PackableTest<RawClusterData>[] = [
    {
      packable: {
        name: 'cluster name',
        description: 'description of the cluster',
      },
      packed:
        '0x3e00000010000000200000003e0000000c000000636c7573746572206e616d651a0000006465736372697074696f6e206f662074686520636c7573746572',
    },
    {
      packable: {
        name: 'cluster name',
        description: 'description of the cluster',
        mutantId: '0x000000000000000000000000000000000000000000000000000000000000000a',
      },
      packed:
        '0x6200000010000000200000003e0000000c000000636c7573746572206e616d651a0000006465736372697074696f6e206f662074686520636c757374657220000000000000000000000000000000000000000000000000000000000000000000000a',
    },
  ];
  it('Pack ClusterData', function () {
    for (let i = 0; i < clusterDataTests.length; i++) {
      const test = clusterDataTests[i];
      const packed = packRawClusterData(test.packable);
      const packedHex = bytes.hexify(packed);
      expect(packedHex).eq(test.packed, `ClusterData in test #${i} should be packable`);
    }
  });
  it('Unpack ClusterData', function () {
    for (let i = 0; i < clusterDataTests.length; i++) {
      const test = clusterDataTests[i];
      const unpacked = unpackToRawClusterData(test.packed);

      // ClusterData.name
      expect(unpacked.name).eq(test.packable.name, `ClusterData.name in test #${i} should be unpackable`);

      // ClusterData.description
      expect(unpacked.description).eq(
        test.packable.description,
        `ClusterData.description in test #${i} should be unpackable`,
      );
    }
  });
  const clusterDataV1Tests: PackableTest<RawClusterData>[] = [
    {
      packable: {
        name: 'cluster name',
        description: 'description of the cluster',
      },
      packed:
        '0x3a0000000c0000001c0000000c000000636c7573746572206e616d651a0000006465736372697074696f6e206f662074686520636c7573746572',
    },
  ];
  it('Pack ClusterDataV1', function () {
    for (let i = 0; i < clusterDataV1Tests.length; i++) {
      const test = clusterDataV1Tests[i];
      const packed = packRawClusterData(test.packable, 'v1');
      const packedHex = bytes.hexify(packed);
      expect(packedHex).eq(test.packed, `ClusterDataV1 in test #${i} should be packable`);
    }
  });
  it('Unpack ClusterDataV1', function () {
    for (let i = 0; i < clusterDataV1Tests.length; i++) {
      const test = clusterDataV1Tests[i];
      const unpacked = unpackToRawClusterData(test.packed);
      const unpackedV1 = unpackToRawClusterData(test.packed, 'v1');

      // Cluster unpacked with/without version specified should be the same
      expect(unpacked).toEqual(unpackedV1);

      // ClusterData.name
      expect(unpacked.name).eq(test.packable.name, `ClusterDataV1.name in test #${i} should be unpackable`);

      // ClusterData.description
      expect(unpacked.description).eq(
        test.packable.description,
        `ClusterDataV1.description in test #${i} should be unpackable`,
      );
    }
  });

  /**
   * ClusterProxyArgs
   */
  const clusterProxyArgsTests: PackableTest<RawClusterProxyArgs>[] = [
    {
      packable: {
        id: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9',
        minPayment: void 0,
      },
      packed: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9',
    },
    {
      packable: {
        id: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9',
        minPayment: BI.from(1),
      },
      packed: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b90100000000000000',
    },
    {
      packable: {
        id: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9',
        minPayment: BI.from(255),
      },
      packed: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9ff00000000000000',
    },
  ];
  it('Pack ClusterProxyArgs', function () {
    for (let i = 0; i < clusterProxyArgsTests.length; i++) {
      const test = clusterProxyArgsTests[i];
      const packed = packRawClusterProxyArgs(test.packable);
      const packedHex = bytes.hexify(packed);
      expect(packedHex).eq(test.packed, `ClusterProxyArgs in test #${i} should be packable`);
    }
  });
  it('Unpack ClusterProxyArgs', function () {
    for (let i = 0; i < clusterProxyArgsTests.length; i++) {
      const test = clusterProxyArgsTests[i];
      const unpacked = unpackToRawClusterProxyArgs(test.packed);

      // ClusterProxyArgs.id
      expect(unpacked.id).eq(test.packable.id, `ClusterProxyArgs.id in test #${i} should be unpackable`);

      // ClusterProxyArgs.minPayment
      if (test.packable.minPayment !== void 0) {
        expect(unpacked.minPayment).toBeDefined();
        const minPayment = unpacked.minPayment!.toHexString();
        const expectMinPayment = test.packable.minPayment!.toHexString();
        expect(minPayment).eq(expectMinPayment, `ClusterProxyArgs.minPayment in test #${i} should be unpackable`);
      } else {
        expect(unpacked.minPayment).toBeUndefined();
      }
    }
  });
  const clusterProxyArgsFailTests: RawClusterProxyArgs[] = [
    {
      id: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9ff',
      minPayment: void 0,
    },
    {
      id: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9',
      minPayment: BI.from(256),
    },
  ];
  it('Pack unpackable ClusterProxyArgs', function () {
    for (const test of clusterProxyArgsFailTests) {
      expect(() => packRawClusterProxyArgs(test, 'power')).toThrow();
    }
  });

  /**
   * ClusterAgentData
   */
  const clusterAgentDataTests: PackableTest<RawClusterAgentData>[] = [
    {
      packable: {
        codeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        hashType: 'type',
        args: '0x8e005ff187895a0ae9288462299b6e43ee349fafdf3bca4a3886285b5439d7b9',
      },
      packed: '0xbd18dfa7db881ee319740db006d7495d96074fbbffc7a4fab5e5adb176305357',
    },
  ];
  it('Pack ClusterAgentData', function () {
    for (let i = 0; i < clusterAgentDataTests.length; i++) {
      const test = clusterAgentDataTests[i];
      const packedHex = packRawClusterAgentDataToHash(test.packable);
      expect(packedHex).eq(test.packed, `ClusterAgentData in test #${i} should be packable`);
    }
  });
});
