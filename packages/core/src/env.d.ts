/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK: string;
  readonly VITE_CONFIG_PATH: string;
  readonly VITE_TESTS_CLUSTER_V1: string;
  readonly VITE_ACCOUNT_CHARLIE: string;
  readonly VITE_ACCOUNT_ALICE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
