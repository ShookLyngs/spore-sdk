# @spore-sdk/core

## About

<p>
  <a href="https://www.npmjs.com/package/@spore-sdk/core">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/@spore-sdk/core?colorA=21262d&colorB=21262d&style=flat">
      <img src="https://img.shields.io/npm/v/@spore-sdk/core?colorA=f6f8fa&colorB=f6f8fa&style=flat" alt="Version">
    </picture>
  </a>
  <a href="https://github.com/sporeprotocol/spore-sdk/blob/main/LICENSE">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/l/@spore-sdk/core?colorA=21262d&colorB=21262d&style=flat">
      <img src="https://img.shields.io/npm/l/@spore-sdk/core?colorA=f6f8fa&colorB=f6f8fa&style=flat" alt="MIT License">
    </picture>
  </a>
  <a href="https://www.npmjs.com/package/@spore-sdk/core">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/dm/@spore-sdk/core?colorA=21262d&colorB=21262d&style=flat">
      <img src="https://img.shields.io/npm/dm/@spore-sdk/core?colorA=f6f8fa&colorB=f6f8fa&style=flat" alt="Downloads per month">
    </picture>
  </a>
</p>

The `@spore-sdk/core` package provides essential tools for constructing basic and advanced transactions on spores and clusters. Additionally, it offers convenient utilities for handling [serialization](https://github.com/nervosnetwork/molecule) of spores/clusters.

## Features

- ⚡ Composed APIs for efficient spores/clusters interactions with minimal time overhead
- 🧩 Joint APIs for building advanced transactions as a fun block-building process
- 🛠️ Utilities for encoding/decoding data of spores/clusters
- 🎹 Fully written in TypeScript

## Getting started

### Installation

Install `@spore-sdk/core` as a dependency using any package manager, such as `npm`:

```shell
npm install @spore-sdk/core
```

### Browser environment

Spore SDK is built on top of [Lumos](https://github.com/ckb-js/lumos), an open-source dapp framework for Nervos CKB. Lumos incorporates certain Node-polyfills into its implementation to provide specific functionalities, such as:

- `crypto-browserify`
- `buffer`

If you wish to use the Spore SDK in a browser environment, it's important to manually add Node-polyfills to your application. This ensures that the Spore SDK functions properly in the browser. Visit: [CRA, Vite, Webpack or Other](https://lumos-website.vercel.app/recipes/cra-vite-webpack-or-other).

### About the project

This package is a part of the Spore SDK monorepo.

For complete descriptions and instructions, visit: [Spore SDK](../../README.md).

## License

[MIT](../../LICENSE) License
