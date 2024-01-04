import { resolve } from 'path';
import { readFileSync } from 'fs';
import { bytes } from '@ckb-lumos/codec';
import { ParamsFormatter } from '@ckb-lumos/rpc';
import { common } from '@ckb-lumos/common-scripts';
import { Address, Hash, Script } from '@ckb-lumos/base';
import { hd, helpers, HexString, RPC } from '@ckb-lumos/lumos';
import { SporeConfig } from '../../config';
import { bytifyRawString, isScriptValueEquals } from '../../helpers';
import { defaultEmptyWitnessArgs, updateWitnessArgs } from '../../helpers';
import { createCapacitySnapshotFromTransactionSkeleton } from '../../helpers';

export interface TestAccount {
  lock: Script;
  address: Address;
  signMessage(message: HexString): Hash;
  signTransaction(txSkeleton: helpers.TransactionSkeletonType): helpers.TransactionSkeletonType;
}

export function createTestAccount(privateKey: HexString, config: SporeConfig): TestAccount {
  const Secp256k1Blake160 = config.lumos.SCRIPTS.SECP256K1_BLAKE160!;

  const lock: Script = {
    codeHash: Secp256k1Blake160.CODE_HASH,
    hashType: Secp256k1Blake160.HASH_TYPE,
    args: hd.key.privateKeyToBlake160(privateKey),
  };
  const address = helpers.encodeToAddress(lock, {
    config: config.lumos,
  });

  function signTransaction(txSkeleton: helpers.TransactionSkeletonType) {
    const signingEntries = txSkeleton.get('signingEntries');
    const signatures = new Map<HexString, Hash>();

    let witnesses = txSkeleton.get('witnesses');
    for (let i = 0; i < signingEntries.size; i++) {
      const entry = signingEntries.get(i)!;
      if (entry.type === 'witness_args_lock') {
        const input = txSkeleton.get('inputs').get(entry.index);
        if (!input || !isScriptValueEquals(input.cellOutput.lock, lock)) {
          continue;
        }
        if (!signatures.has(entry.message)) {
          const sig = signMessage(entry.message);
          signatures.set(entry.message, sig);
        }

        const witness = witnesses.get(entry.index, defaultEmptyWitnessArgs);

        const signature = signatures.get(entry.message)!;
        const newWitness = updateWitnessArgs(witness, 'lock', signature);
        witnesses = witnesses.set(entry.index, newWitness);
      }
    }

    return txSkeleton.set('witnesses', witnesses);
  }

  function signMessage(message: HexString): Hash {
    return hd.key.signRecoverable(message, privateKey);
  }

  return {
    lock,
    address,
    signMessage,
    signTransaction,
  };
}

export async function signAndSendTransaction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  account: TestAccount | TestAccount[];
  config: SporeConfig;
  debug?: boolean;
  send?: boolean;
  rpc?: RPC;
}): Promise<Hash | undefined> {
  // Env
  const { account, config } = props;
  const rpc = props.rpc ?? new RPC(config.ckbNodeUrl);
  const debug = props.debug ?? true;
  const send = props.send ?? false;

  // Get TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Prepare unsigned messages
  txSkeleton = common.prepareSigningEntries(txSkeleton, { config: config.lumos });

  // Sign transaction
  const accounts = Array.isArray(account) ? account : [account];
  for (const currentAccount of accounts) {
    txSkeleton = currentAccount.signTransaction(txSkeleton);
  }

  if (debug) {
    const snap = createCapacitySnapshotFromTransactionSkeleton(txSkeleton);
    console.log('CapacitySnapshot.inputsCapacity:', snap.inputsCapacity.toString());
    console.log('CapacitySnapshot.outputsCapacity:', snap.outputsCapacity.toString());
  }

  // Convert to Transaction
  const tx = helpers.createTransactionFromSkeleton(txSkeleton);
  if (debug) {
    console.log('RPC Transaction:', JSON.stringify(ParamsFormatter.toRawTransaction(tx), null, 2));
  }

  // Send transaction
  let hash: Hash | undefined;
  if (send) {
    hash = await rpc.sendTransaction(tx, 'passthrough');
    if (debug) {
      console.log('TransactionHash:', hash);
    }
  }

  return hash;
}

export async function fetchLocalImage(
  src: string,
  relativePath?: string,
): Promise<{
  arrayBuffer: ArrayBuffer;
  arrayBufferHex: HexString;
  base64: string;
  base64Hex: HexString;
}> {
  const buffer = readFileSync(resolve(relativePath ?? __dirname, src));
  const arrayBuffer = new Uint8Array(buffer).buffer;
  const base64 = buffer.toString('base64');
  return {
    arrayBuffer,
    arrayBufferHex: bytes.hexify(arrayBuffer),
    base64,
    base64Hex: bytes.hexify(bytifyRawString(base64)),
  };
}

export async function fetchInternetImage(src: string): Promise<ArrayBuffer> {
  const res = await fetch(src);
  return await res.arrayBuffer();
}
