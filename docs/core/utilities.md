# Utilities

<!-- TOC -->
* [Utilities](#utilities)
  * [SporeConfig](#sporeconfig)
    * [getSporeConfig](#getsporeconfig)
      * [Example](#example)
    * [setSporeConfig](#setsporeconfig)
      * [Example](#example-1)
    * [forkSporeConfig](#forksporeconfig)
      * [Example](#example-2)
  * [SporeScript](#sporescript)
    * [getSporeScript](#getsporescript)
      * [Example](#example-3)
    * [isSporeScriptSupported](#issporescriptsupported)
      * [Example](#example-4)
  * [RawString](#rawstring)
    * [bytifyRawString](#bytifyrawstring)
      * [Example](#example-5)
    * [bufferToRawString](#buffertorawstring)
      * [Example](#example-6)
  * [ContentType](#contenttype)
    * [encodeContentType](#encodecontenttype)
      * [Example](#example-7)
    * [decodeContentType](#decodecontenttype)
      * [Example](#example-8)
    * [isContentTypeValid](#iscontenttypevalid)
      * [Example](#example-9)
  * [Transaction](#transaction)
    * [waitForTransaction](#waitfortransaction)
      * [Example](#example-10)
<!-- TOC -->

## SporeConfig

### getSporeConfig

Get the global default SporeConfig.
The default config is "predefinedSporeConfigs.Aggron4".

```typescript
declare function getSporeConfig<T extends string = string>(): SporeConfig<T>;
```

#### Example

```typescript
const config = getSporeConfig();
```

### setSporeConfig

Set the global default SporeConfig.
The default config is "predefinedSporeConfigs.Aggron4".

```typescript
declare function setSporeConfig<T extends string = string>(config: SporeConfig<T>): void; 
```

#### Example

```typescript
setSporeConfig(predefinedSporeConfigs.Aggron4);
```

### forkSporeConfig

Clone and create a new SporeConfig.

```typescript
declare function forkSporeConfig<T1 extends string, T2 extends string>(
  origin: SporeConfig<T1>,
  change: Partial<SporeConfig<T2>>,
): SporeConfig<T1 | T2>;
```

#### Example

```typescript
const originalConfig = predefinedSporeConfigs.Aggron4;
const forkedConfig = forkSporeConfig(originalConfig, {
  maxTransactionSize: 100,
});
```

## SporeScript

### getSporeScript

Get a specific SporeScript from SporeConfig by "scriptName" with optional "scriptId" or "tags".
Throws an error if the script doesn't exist.

```typescript
declare function getSporeScript(config: SporeConfig, scriptName: string): SporeScript;
declare function getSporeScript(config: SporeConfig, scriptName: string, tags: string[]): SporeScript;
declare function getSporeScript(config: SporeConfig, scriptName: string, scriptId: ScriptId): SporeScript;
```

#### Example

Getting the latest version of the "Spore" script:

```typescript
const sporeScript = getSporeScript(config, 'Spore');
```

Getting the latest "Spore" script with the "latest" tag:

```typescript
const sporeScript = getSporeScript(config, 'Spore', ['latest']);
```

Getting the exact "Spore" script with the specified ScriptId:

```typescript
const sporeScript = getSporeScript(config, 'Spore', {
  codehash: '0xbbad126377d45f90a8ee120da988a2d7332c78ba8fd679aab478a19d6c133494',
  hashType: 'data1',
});
```

### isSporeScriptSupported

Returns a boolean indicating whether the target ScriptId exists in the SporeConfig.
If "scriptName" is passed, it also checks whether the name of the target script matches.

```typescript
declare function isSporeScriptSupported(config: SporeConfig, scriptId: ScriptId, scriptName?: string): boolean;
```

#### Example

Check if the target cell is a script supported by the SporeConfig:

```typescript
const cell: Cell = { ... };
const isSupported = isSporeScriptSupported(config, cell.cellOutput.type, 'Spore');
console.log(isSupported); // true or false
```

Check if the target cell is a Spore:

```typescript
const cell: Cell = { ... };
const isSupported = isSporeScriptSupported(config, cell.cellOutput.type, 'Spore');
console.log(isSupported); // true or false
```

## RawString

### bytifyRawString

Pack UTF-8 raw string to Uint8Array.

```typescript
declare function bytifyRawString(text: string): Uint8Array;
```

#### Example

```typescript
const bytes: Uint8Array = bytifyRawString('hello world');
console.log(bytes.hexify(bytes)); // 0x07000000636f6e74656e74
```

### bufferToRawString

Unpack Uint8Array to UTF-8 raw string.

```typescript
declare function bufferToRawString(source: BytesLike, options?: TextDecodeOptions): string;
```

#### Example

```typescript
const text: string = bufferToRawString('0x07000000636f6e74656e74');
console.log(text); // content
```

## ContentType

### encodeContentType

Convert ContentType object to string.

```typescript
declare function encodeContentType(encodable: EncodableContentType): string;
```

#### Example

```typescript
const contentType = encodeContentType({
  type: 'image',
  subtype: 'svg+xml',
  parameters: {
    immortal: true,
    q: 0.9,
  },
});
console.log(contentType); // 'image/svg+xml;immortal=true;q=0.9'
```

### decodeContentType

Convert string to ContentType object.

```typescript
declare function decodeContentType(contentType: string): DecodedContentType;
```

#### Example

```typescript
const decoded = decodeContentType('image/svg+xml;immortal=true;q=0.9');
console.log(decoded); // { type: 'image', subtype: 'svg+xml', mediaType: 'image/svg+xml', parameters: { immortal: true, q: 0.9 } }
```

### isContentTypeValid

Check if the target ContentType's format is valid.

```typescript
declare function isContentTypeValid(contentType: string): boolean;
```

#### Example

```typescript
const result1 = isContentTypeValid('image/svg+xml;immortal=true;q=0.9');
console.log(result1); // true

const result2 = isContentTypeValid('image/;test=1');
console.log(result2); // false
```

## Transaction

### waitForTransaction

Wait for a transaction to be committed on-chain.
Will throw an error if the transaction is not committed within approximately 2 minutes.

```typescript
declare function waitForTransaction(hash: Hash, rpc: RPC): Promise<TransactionWithStatus>;
```

#### Example

```typescript
import { RPC } from '@ckb-lumos/lumos';

const rpc = new RPC(predefinedSporeConfigs.Aggron4.ckbNodeUrl);
const tx = await waitForTransaction('0x...', rpc);
```
