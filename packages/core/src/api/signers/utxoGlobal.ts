import { helpers } from '@ckb-lumos/lumos';
import { ccc } from '@ckb-ccc/core';
import { UtxoGlobal } from '@ckb-ccc/utxo-global';
import { Provider } from '@ckb-ccc/utxo-global/src/advancedBarrel';

let mainnetUtxoGlobalSigner: UtxoGlobal.SignerCkb | undefined = undefined;
let testnetUtxoGlobalSigner: UtxoGlobal.SignerCkb | undefined = undefined;

/**
 * Get the raw UtxoGlobal signer according to the network type.
 *
 * @param network The network type, either "mainnet" or "testnet".
 * @returns The UtxoGlobal signer for CKB specific.
 */
export function getUtxoGlobalSigner(network: 'mainnet' | 'testnet'): UtxoGlobal.SignerCkb {
  const windowRef = window as {
    utxoGlobal?: {
      bitcoinSigner: Provider;
      ckbSigner: Provider;
    };
  };

  if (typeof windowRef.utxoGlobal === 'undefined') {
    throw new Error('UtxoGlobal is not loaded');
  }

  if (network === 'mainnet') {
    if (mainnetUtxoGlobalSigner) {
      return mainnetUtxoGlobalSigner;
    }
    const client = new ccc.ClientPublicMainnet();
    mainnetUtxoGlobalSigner = new UtxoGlobal.SignerCkb(client, windowRef.utxoGlobal.ckbSigner);
    return mainnetUtxoGlobalSigner;
  } else {
    if (testnetUtxoGlobalSigner) {
      return testnetUtxoGlobalSigner;
    }
    const client = new ccc.ClientPublicTestnet();
    testnetUtxoGlobalSigner = new UtxoGlobal.SignerCkb(client, windowRef.utxoGlobal.ckbSigner);
    return testnetUtxoGlobalSigner;
  }
}

/**
 * Sign a Lumos transaction with UtxoGlobal, the web browser extension.
 *
 * @param skeleton The Lumos transaction skeleton.
 * @param network The network type, either "mainnet" or "testnet".
 * @param send Whether to send the transaction after signing. Default is false.
 * @returns The signed transaction and the transaction hash if `send` is set to True.
 */
export async function signTransactionWithUtxoGlobal(props: {
  skeleton: helpers.TransactionSkeletonType;
  network: 'mainnet' | 'testnet';
  send?: boolean;
}): Promise<{
  cccTx: ccc.Transaction;
  txHash: ccc.Hex;
}> {
  const send = props.send ?? false;
  const signer = getUtxoGlobalSigner(props.network);
  if (!signer.isConnected()) {
    await signer.connect();
  }
  const tx = ccc.Transaction.fromLumosSkeleton(props.skeleton);
  const signedTx = await signer.signTransaction(tx);

  let txHash: ccc.Hex | undefined = undefined;
  if (send) {
    txHash = await signer.client.sendTransaction(signedTx);
  }

  return {
    cccTx: signedTx,
    txHash: txHash!,
  };
}
