import { helpers } from '@ckb-lumos/lumos';
import { ccc } from '@ckb-ccc/core';
import { signTransaction } from './abstract';

/**
 * Sign a Lumos transaction with a private key in direct, mostly used in backend server.
 *
 * @param skeleton The Lumos transaction skeleton.
 * @param privkey The private key in hex format.
 * @param network The network type, either "mainnet" or "testnet". Default is "testnet".
 * @param send Whether to send the transaction after signing. Default is false.
 * @returns The signed transaction and the transaction hash if `send` is True.
 */
export async function signTransactionWithPrivateKey(props: {
  skeleton: helpers.TransactionSkeletonType;
  privkey: ccc.Hex;
  network?: 'mainnet' | 'testnet';
  send?: boolean;
}): Promise<{
  cccTx: ccc.Transaction;
  txHash?: ccc.Hex;
}> {
  let network = props.network;
  if (!network) {
    network = 'testnet';
  }
  let client: ccc.Client | undefined = undefined;
  if (props.network === 'mainnet') {
    client = new ccc.ClientPublicMainnet();
  } else {
    client = new ccc.ClientPublicTestnet();
  }

  const send = props.send ?? false;
  const privkeySigner = new ccc.SignerCkbPrivateKey(client, props.privkey);
  return await signTransaction({ skeleton: props.skeleton, signer: privkeySigner, send });
}
