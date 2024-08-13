import { helpers } from '@ckb-lumos/lumos';
import { ccc } from '@ckb-ccc/core';

/**
 * Sign a Lumos transaction with the specified signer.
 *
 * @param skeleton The Lumos transaction skeleton.
 * @param signer An abstract signer from ccc to sign the transaction.
 * @param send Whether to send the transaction after signing. Default is false.
 * @returns The signed transaction and the transaction hash if `send` is set to True.
 */
export async function signTransaction(props: {
  skeleton: helpers.TransactionSkeletonType;
  signer: ccc.Signer;
  send?: boolean;
}): Promise<{
  cccTx: ccc.Transaction;
  txHash?: ccc.Hex;
}> {
  const send = props.send ?? false;
  const signer = props.signer;
  const tx = ccc.Transaction.fromLumosSkeleton(props.skeleton);
  const signedTx = await signer.signTransaction(tx);
  if (send) {
    const txHash = await signer.sendTransaction(signedTx);
    return { cccTx: signedTx, txHash };
  } else {
    return { cccTx: signedTx };
  }
}
