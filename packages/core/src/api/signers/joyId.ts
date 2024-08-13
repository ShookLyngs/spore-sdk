import { ccc } from '@ckb-ccc/core';
import { JoyId } from '@ckb-ccc/joy-id';
import { helpers } from '@ckb-lumos/lumos';
import { signTransaction } from './abstract';

let mainnetJoyIdSigner: JoyId.CkbSigner | undefined = undefined;
let testnetJoyIdSigner: JoyId.CkbSigner | undefined = undefined;

export interface SignerInfo {
  network: 'mainnet' | 'testnet';
  appName: string;
  logoUrl: string;
}

/**
 * Get the raw JoyId signer according to the network type.
 *
 * @param signerInfo The Indicator of network type and JoyId considered information.
 * @returns JoyId signer for CKB specific.
 */
export function getJoyIdSigner(signerInfo: SignerInfo): JoyId.CkbSigner {
  if (signerInfo.network === 'mainnet') {
    if (mainnetJoyIdSigner) {
      return mainnetJoyIdSigner;
    }
    const client = new ccc.ClientPublicMainnet();
    mainnetJoyIdSigner = new JoyId.CkbSigner(client, signerInfo.appName, signerInfo.logoUrl);
    return mainnetJoyIdSigner;
  } else {
    if (testnetJoyIdSigner) {
      return testnetJoyIdSigner;
    }
    const client = new ccc.ClientPublicTestnet();
    testnetJoyIdSigner = new JoyId.CkbSigner(client, signerInfo.appName, signerInfo.logoUrl);
    return testnetJoyIdSigner;
  }
}

/**
 * Sign a Lumos transaction with JoyId.
 *
 * @param skeleton The Lumos transaction skeleton.
 * @param signerInfo The Indicator of network type and JoyId considered information.
 * @param send Whether to send the transaction after signing. Default is false.
 * @returns The signed transaction and the transaction hash if `send` is True.
 */
export async function signTransactionWithJoyId(props: {
  skeleton: helpers.TransactionSkeletonType;
  signerInfo: SignerInfo;
  send?: boolean;
}): Promise<{
  cccTx: ccc.Transaction;
  txHash?: ccc.Hex;
}> {
  const send = props.send ?? false;
  const signer = getJoyIdSigner(props.signerInfo);
  if (!signer.isConnected()) {
    await signer.connect();
  }
  return await signTransaction({ skeleton: props.skeleton, signer, send });
}
