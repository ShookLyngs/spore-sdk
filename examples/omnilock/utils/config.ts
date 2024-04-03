import { sharedTestingPrivateKeys } from '@spore-examples/shared';
import { predefinedSporeConfigs } from '@spore-sdk/core';
import { createOmnilockSecp256k1Wallet } from './wallet';

/**
 * SporeConfig provides spore/cluster's detailed info like ScriptIds and CellDeps.
 * It is a necessary part for constructing spore/cluster transactions.
 */
export const config = predefinedSporeConfigs.Testnet;

/**
 * Wallets with default testing accounts for running the examples,
 * feel free to replace them with your own testing accounts.
 */
export const accounts = {
  CHARLIE: createOmnilockSecp256k1Wallet({
    privateKey: sharedTestingPrivateKeys.CHARLIE,
    config,
  }),
  ALICE: createOmnilockSecp256k1Wallet({
    privateKey: sharedTestingPrivateKeys.ALICE,
    config,
  }),
};
