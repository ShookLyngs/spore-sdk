import { ParamsFormatter } from '@ckb-lumos/rpc';
import { common } from '@ckb-lumos/common-scripts';
import { Address, Hash, Script } from '@ckb-lumos/base';
import { hd, helpers, HexString, RPC } from '@ckb-lumos/lumos';
import { getSporeConfig, SporeConfig } from '../../config';
import { isScriptValueEquals, updateWitnessArgs, defaultEmptyWitnessArgs } from '../../helpers';

export interface Account {
  lock: Script;
  address: Address;
  signMessage(message: HexString): Hash;
  signTransaction(txSkeleton: helpers.TransactionSkeletonType): helpers.TransactionSkeletonType;
}

export function createDefaultLockAccount(privateKey: HexString, config?: SporeConfig): Account {
  if (!config) {
    config = getSporeConfig();
  }

  const defaultLockScript = config.lumos.SCRIPTS.SECP256K1_BLAKE160!;
  const lock: Script = {
    codeHash: defaultLockScript.CODE_HASH,
    hashType: defaultLockScript.HASH_TYPE,
    args: hd.key.privateKeyToBlake160(privateKey),
  };

  const address = helpers.encodeToAddress(lock, {
    config: config.lumos,
  });

  function signMessage(message: HexString): Hash {
    return hd.key.signRecoverable(message, privateKey);
  }

  function signTransaction(txSkeleton: helpers.TransactionSkeletonType): helpers.TransactionSkeletonType {
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

  return {
    lock,
    address,
    signMessage,
    signTransaction,
  };
}

export async function signAndSendTransaction(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  account: Account | Account[];
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
