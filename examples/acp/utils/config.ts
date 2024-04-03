import { sharedTestingPrivateKeys } from '@spore-examples/shared';
import { predefinedSporeConfigs } from '@spore-sdk/core';
import { createSecp256k1Wallet } from './wallet';

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
  CHARLIE: createSecp256k1Wallet(sharedTestingPrivateKeys.CHARLIE, config),
  ALICE: createSecp256k1Wallet(sharedTestingPrivateKeys.ALICE, config),
};
