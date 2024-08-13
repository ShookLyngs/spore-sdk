import { ccc } from '@ckb-ccc/core';
import { Eip6963 } from '@ckb-ccc/eip6963';
import { ProviderDetail } from '@ckb-ccc/eip6963/src/eip6963.advanced';
import { helpers } from '@ckb-lumos/lumos';
import { signTransaction } from './abstract';

let mainnetEip6963Signer: Eip6963.Signer | undefined = undefined;
let testnetEip6963Signer: Eip6963.Signer | undefined = undefined;

/**
 * Get the raw Eip6963 signer according to the network type.
 *
 * @param network The network type, either "mainnet" or "testnet".
 * @returns The Eip6963 signer.
 */
export function getEip6963Signer(network: 'mainnet' | 'testnet'): Eip6963.Signer {
  const windowRef = window as { ethereum?: ProviderDetail };

  if (!windowRef.ethereum) {
    throw new Error('Eip6963 compatible wallet is not loaded');
  }

  if (network === 'mainnet') {
    if (mainnetEip6963Signer) {
      return mainnetEip6963Signer;
    }
    const client = new ccc.ClientPublicMainnet();
    mainnetEip6963Signer = new Eip6963.Signer(client, windowRef.ethereum);
    return mainnetEip6963Signer;
  } else {
    if (testnetEip6963Signer) {
      return testnetEip6963Signer;
    }
    const client = new ccc.ClientPublicTestnet();
    testnetEip6963Signer = new Eip6963.Signer(client, windowRef.ethereum);
    return testnetEip6963Signer;
  }
}

/**
 * Sign a Lumos transaction with Eip6963 compatible wallet.
 *
 * @param skeleton The Lumos transaction skeleton.
 * @param network The network type, either "mainnet" or "testnet".
 * @param send Whether to send the transaction after signing. Default is false.
 * @returns The signed transaction and the transaction hash if `send` is set to True.
 */
export async function signTransactionWithEip6963CompatibleWallet(props: {
  skeleton: helpers.TransactionSkeletonType;
  network: 'mainnet' | 'testnet';
  privkey: ccc.Hex;
  send?: boolean;
}): Promise<{
  cccTx: ccc.Transaction;
  txHash?: ccc.Hex;
}> {
  const send = props.send ?? false;
  const signer = getEip6963Signer(props.network);
  if (!signer.isConnected()) {
    await signer.connect();
  }
  return await signTransaction({ skeleton: props.skeleton, signer, send });
}
