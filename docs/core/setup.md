
# Start using Spore SDK

## Installation

Install `@spore-sdk/core` as a dependency using any package manager, such as `npm`:

```shell
npm install @spore-sdk/core
```

## Browser environment

Spore SDK is built on top of [Lumos](https://github.com/ckb-js/lumos), an open-source dapp framework for Nervos CKB. Lumos incorporates certain Node-polyfills into its implementation to provide specific functionalities, such as:

- `crypto-browserify` 
- `buffer`

If you wish to use the Spore SDK in a browser environment, it's important to manually add Node-polyfills to your application. This ensures that the Spore SDK functions properly in the browser. Visit: [CRA, Vite, Webpack or Other](https://lumos-website.vercel.app/recipes/cra-vite-webpack-or-other).
