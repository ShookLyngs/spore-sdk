import { helpers } from '@ckb-lumos/lumos';
import { ccc } from '@ckb-ccc/core';

/**
 * Sign a Lumos transaction with a private key in direct, mostly used in backend server.
 *
 * @param skeleton The Lumos transaction skeleton.
 * @param network The network type, either "mainnet" or "testnet".
 * @param privkey The private key in hex format.
 * @param send Whether to send the transaction after signing. Default is false.
 * @returns The signed transaction and the transaction hash if `send` is True.
 */
export async function signTransactionWithPrivateKey(props: {
  skeleton: helpers.TransactionSkeletonType;
  network: 'mainnet' | 'testnet';
  privkey: ccc.Hex;
  send?: boolean;
}): Promise<{
  cccTx: ccc.Transaction;
  txHash?: ccc.Hex;
}> {
  let client: ccc.Client | undefined = undefined;
  if (props.network === 'mainnet') {
    client = new ccc.ClientPublicMainnet();
  } else {
    client = new ccc.ClientPublicTestnet();
  }

  const send = props.send ?? false;
  const tx = ccc.Transaction.fromLumosSkeleton(props.skeleton);
  const privkeySigner = new ccc.SignerCkbPrivateKey(client, props.privkey);
  const signedTx = await privkeySigner.signTransaction(tx);

  let txHash: ccc.Hex | undefined = undefined;
  if (send) {
    txHash = await client.sendTransaction(signedTx);
  }

  return {
    cccTx: signedTx,
    txHash,
  };
}
