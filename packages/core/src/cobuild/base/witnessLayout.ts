import { helpers } from '@ckb-lumos/lumos';
import { blockchain } from '@ckb-lumos/base';
import { bytes, BytesLike, number, UnpackResult } from '@ckb-lumos/codec';
import { WitnessLayout, WitnessLayoutFieldTags } from '../codec/witnessLayout';
import { ActionVec } from '../codec/buildingPacket';

export function getWitnessType(witness?: BytesLike) {
  const buf = bytes.bytify(witness ?? []);
  if (buf.length > 4) {
    const typeIndex = number.Uint32LE.unpack(buf.slice(0, 4));
    if (typeIndex >= WitnessLayoutFieldTags.SighashAll) {
      for (const [name, index] of Object.entries(WitnessLayoutFieldTags)) {
        if (index === typeIndex) {
          return name;
        }
      }
    } else {
      return 'WitnessArgs';
    }
  }

  throw new Error('Unknown witness format');
}

export function unpackWitness(witness?: BytesLike) {
  const buf = bytes.bytify(witness ?? []);
  if (buf.length > 4) {
    const typeIndex = number.Uint32LE.unpack(buf.slice(0, 4));
    try {
      if (typeIndex >= WitnessLayoutFieldTags.SighashAll) {
        return WitnessLayout.unpack(buf);
      } else {
        return {
          type: 'WitnessArgs',
          value: blockchain.WitnessArgs.unpack(buf),
        };
      }
    } catch (_err) {
      // passthrough
    }
  }

  throw new Error('Unknown witness format');
}

export function assembleCobuildWitnessLayout(actions: UnpackResult<typeof ActionVec>): string {
  const witness = bytes.hexify(
    WitnessLayout.pack({
      type: 'SighashAll',
      value: {
        seal: '0x',
        message: {
          actions,
        },
      },
    }),
  );
  return witness;
}

export function injectCommonCobuildProof(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  actions: UnpackResult<typeof ActionVec>;
}): {
  txSkeleton: helpers.TransactionSkeletonType;
  witnessIndex: number;
} {
  let txSkeleton = props.txSkeleton;

  // TODO: add Cobuild witness-check: If it's in legacy mode, manually add WitnessLayout
  if (txSkeleton.get('inputs').size > 0) {
    // Generate WitnessLayout

    // Append the witness to the end of the witnesses
    let witnessIndex: number | undefined;
    txSkeleton = txSkeleton.update('witnesses', (witnesses) => {
      witnessIndex = witnesses.size;
      const witness = assembleCobuildWitnessLayout(props.actions);
      return witnesses.push(witness);
    });

    return {
      txSkeleton,
      witnessIndex: witnessIndex!,
    };
  }

  throw new Error('Cannot inject CobuildProof into a Transaction without witnesses');
}
