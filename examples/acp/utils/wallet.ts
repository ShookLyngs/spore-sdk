import { SporeConfig, defaultEmptyWitnessArgs } from '@spore-sdk/core';
import { updateWitnessArgs, isScriptValueEquals, isScriptIdEquals } from '@spore-sdk/core';
import { anyoneCanPay, secp256k1Blake160 } from '@ckb-lumos/common-scripts';
import { hd, helpers, HexString, RPC } from '@ckb-lumos/lumos';
import { Address, Hash, Script } from '@ckb-lumos/base';
import { bytes, number } from '@ckb-lumos/codec';

export interface Secp256k1Wallet {
  lock: Script;
  address: Address;
  createAcpLock(props?: { minCkb?: number }): Script;
  signMessage(message: HexString): Hash;
  signTransaction(txSkeleton: helpers.TransactionSkeletonType): helpers.TransactionSkeletonType;
  signAndSendTransaction(txSkeleton: helpers.TransactionSkeletonType): Promise<Hash>;
}

/**
 * Create a Secp256k1Blake160 Sign-all Wallet by a private key and a SporeConfig,
 * providing lock/address, and functions sign message/transaction and send the transaction on-chain.
 *
 * Note: The generated wallet also supports ACP (Anyone-can-pay) lock,
 * since the ACP lock is designed/implemented based on the Secp256k1Blake160 Sign-all lock.
 */
export function createSecp256k1Wallet(privateKey: HexString, config: SporeConfig): Secp256k1Wallet {
  const Secp256k1Blake160 = config.lumos.SCRIPTS.SECP256K1_BLAKE160!;
  const AnyoneCanPay = config.lumos.SCRIPTS.ANYONE_CAN_PAY!;

  // Generate a lock script from the private key
  const blake160 = hd.key.privateKeyToBlake160(privateKey);
  const lock: Script = {
    codeHash: Secp256k1Blake160.CODE_HASH,
    hashType: Secp256k1Blake160.HASH_TYPE,
    args: blake160,
  };

  // Generate address from the lock script
  const address = helpers.encodeToAddress(lock, {
    config: config.lumos,
  });

  // Create an Anyone-can-pay lock script
  // minCkb: The minimal required digit of payment CKBytes.
  // Refer to: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0026-anyone-can-pay/0026-anyone-can-pay.md
  function createAcpLock(props?: { minCkb?: number }): Script {
    const minCkb = props?.minCkb;
    const minimalCkb = minCkb !== void 0 ? bytes.hexify(number.Uint8.pack(minCkb as number)) : '';
    return {
      codeHash: AnyoneCanPay.CODE_HASH,
      hashType: AnyoneCanPay.HASH_TYPE,
      args: `${blake160}${removeHexPrefix(minimalCkb)}`,
    };
  }

  // Sign for a message
  function signMessage(message: HexString): Hash {
    return hd.key.signRecoverable(message, privateKey);
  }

  // Sign prepared signing entries,
  // and then fill signatures into Transaction.witnesses
  function signTransaction(txSkeleton: helpers.TransactionSkeletonType): helpers.TransactionSkeletonType {
    const signingEntries = txSkeleton.get('signingEntries');
    const signatures = new Map<HexString, Hash>();
    const inputs = txSkeleton.get('inputs');

    let witnesses = txSkeleton.get('witnesses');
    for (let i = 0; i < signingEntries.size; i++) {
      const entry = signingEntries.get(i)!;
      if (entry.type === 'witness_args_lock') {
        const input = inputs.get(entry.index);
        if (!input) {
          continue;
        }
        if (
          !isScriptValueEquals(input.cellOutput.lock, lock) &&
          !isAcpLockMatches(input.cellOutput.lock, blake160, config)
        ) {
          continue;
        }
        if (!signatures.has(entry.message)) {
          const newSignature = signMessage(entry.message);
          signatures.set(entry.message, newSignature);
        }

        const signature = signatures.get(entry.message)!;
        const witness = witnesses.get(entry.index, defaultEmptyWitnessArgs);
        witnesses = witnesses.set(entry.index, updateWitnessArgs(witness, 'lock', signature));
      }
    }

    return txSkeleton.set('witnesses', witnesses);
  }

  // Sign the transaction and send it via RPC
  async function signAndSendTransaction(txSkeleton: helpers.TransactionSkeletonType): Promise<Hash> {
    // Env
    const rpc = new RPC(config.ckbNodeUrl);

    // Sign transaction
    txSkeleton = secp256k1Blake160.prepareSigningEntries(txSkeleton, { config: config.lumos });
    txSkeleton = anyoneCanPay.prepareSigningEntries(txSkeleton, { config: config.lumos });
    txSkeleton = signTransaction(txSkeleton);

    // Convert to Transaction
    const tx = helpers.createTransactionFromSkeleton(txSkeleton);
    console.log(JSON.stringify(tx, null, 2));

    // Send transaction
    return await rpc.sendTransaction(tx, 'passthrough');
  }

  return {
    lock,
    address,
    signMessage,
    signTransaction,
    signAndSendTransaction,
    createAcpLock,
  };
}

export function isAcpLockMatches(lock: Script, blake160: Hash, config: SporeConfig): boolean {
  const AnyoneCanPay = config.lumos.SCRIPTS.ANYONE_CAN_PAY!;
  const acpScriptId = {
    codeHash: AnyoneCanPay.CODE_HASH,
    hashType: AnyoneCanPay.HASH_TYPE,
  };

  return isScriptIdEquals(lock, acpScriptId) && lock.args.startsWith(blake160);
}

function removeHexPrefix(str: string) {
  return str.startsWith('0x') ? str.slice(2) : str;
}
