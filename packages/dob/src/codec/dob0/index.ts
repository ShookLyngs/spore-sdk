import * as DOB0 from './dob0';
import { bytes } from '@ckb-lumos/codec';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function numberToBuffer(value: bigint): ArrayBuffer {
  const alloc = Buffer.alloc(8);
  alloc.writeBigUint64LE(value);
  return alloc.buffer;
}

function bufferToNumber(buffer: ArrayBuffer): bigint {
  return Buffer.from(buffer).readBigUint64LE();
}

/**
 * @description A wrapper class for DOB0.StringVec
 */
export class StringVec {
  value: Array<string>;

  constructor(value: Array<string>) {
    this.value = value;
  }

  type(): string {
    return 'StringVec';
  }

  materialize(): Array<ArrayBuffer> {
    return this.value.map((str) => encoder.encode(str).buffer);
  }

  public pack(): DOB0.StringVec {
    const serialized = DOB0.SerializeStringVec(this.materialize());
    return new DOB0.StringVec(serialized);
  }

  public static unpack(mol: DOB0.StringVec): StringVec {
    let value = new Array<string>(mol.length());
    for (let i = 0; i < value.length; i++) {
      const bytes = mol.indexAt(i).raw();
      value[i] = decoder.decode(bytes);
    }
    return new StringVec(value);
  }
}

/**
 * @description A wrapper class for DOB0.NumberRange
 */
export class NumberRange {
  start: bigint;
  end: bigint;

  constructor(start: bigint, end: bigint) {
    this.start = start;
    this.end = end;
  }

  type(): string {
    return 'NumberRange';
  }

  materialize(): Array<ArrayBuffer> {
    return [this.start, this.end].map(numberToBuffer);
  }

  public pack(): DOB0.NumberRange {
    const serialized = DOB0.SerializeNumberRange(this.materialize());
    return new DOB0.NumberRange(serialized);
  }

  public static unpack(mol: DOB0.NumberRange): NumberRange {
    const start = bufferToNumber(mol.indexAt(0).raw());
    const end = bufferToNumber(mol.indexAt(1).raw());
    return new NumberRange(start, end);
  }
}

/**
 * @description A wrapper class for DOB0.NumberVec
 */
export class NumberVec {
  value: Array<bigint>;

  constructor(value: Array<bigint>) {
    this.value = value;
  }

  type(): string {
    return 'NumberVec';
  }

  materialize(): Array<ArrayBuffer> {
    return this.value.map(numberToBuffer);
  }

  public pack(): DOB0.NumberVec {
    const serialized = DOB0.SerializeNumberVec(this.materialize());
    return new DOB0.NumberVec(serialized);
  }

  public static unpack(mol: DOB0.NumberVec): NumberVec {
    let value = new Array<bigint>(mol.length());
    for (let i = 0; i < value.length; i++) {
      const bytes = mol.indexAt(i).raw();
      value[i] = bufferToNumber(bytes);
    }
    return new NumberVec(value);
  }
}

/**
 * @description A wrapper class for DOB0.FloatVec
 */
export class FloatVec {
  numeratorVec: NumberVec;
  denominator: bigint;

  constructor(numeratorVec: NumberVec, denominator: bigint) {
    this.numeratorVec = numeratorVec;
    this.denominator = denominator;
  }

  type(): string {
    return 'FloatVec';
  }

  materialize(): {
    numerator_vec: Array<ArrayBuffer>;
    denominator: ArrayBuffer;
  } {
    return {
      numerator_vec: this.numeratorVec.materialize(),
      denominator: numberToBuffer(this.denominator),
    };
  }

  public pack(): DOB0.FloatVec {
    const serialized = DOB0.SerializeFloatVec(this.materialize());
    return new DOB0.FloatVec(serialized);
  }

  public static unpack(mol: DOB0.FloatVec): FloatVec {
    const numeratorVec = NumberVec.unpack(mol.getNumeratorVec());
    const denominator = bufferToNumber(mol.getDenominator().raw());
    return new FloatVec(numeratorVec, denominator);
  }
}

/**
 * @description A wrapper class for DOB0.FloatRange
 */
export class FloatRange {
  numeratorRange: NumberRange;
  denominator: bigint;

  constructor(numeratorRange: NumberRange, denominator: bigint) {
    this.numeratorRange = numeratorRange;
    this.denominator = denominator;
  }

  type(): string {
    return 'FloatRange';
  }

  materialize(): {
    numerator_range: Array<ArrayBuffer>;
    denominator: ArrayBuffer;
  } {
    return {
      numerator_range: this.numeratorRange.materialize(),
      denominator: numberToBuffer(this.denominator),
    };
  }

  public pack(): DOB0.FloatRange {
    const serialized = DOB0.SerializeFloatRange(this.materialize());
    return new DOB0.FloatRange(serialized);
  }

  public static unpack(mol: DOB0.FloatRange): FloatRange {
    const numeratorRange = NumberRange.unpack(mol.getNumeratorRange());
    const denominator = bufferToNumber(mol.getDenominator().raw());
    return new FloatRange(numeratorRange, denominator);
  }
}

/**
 * @description A combination of all possible basic types
 */
export type UnionType = StringVec | NumberVec | FloatVec | NumberRange | FloatRange;

/**
 * @description A wrapper class for DOB0.TraitPool
 */
export class TraitPool {
  union: UnionType;

  constructor(union: UnionType) {
    this.union = union;
  }

  type(): string {
    return this.union.type();
  }

  materialize(): {
    type: string;
    value: any;
  } {
    return {
      type: this.union.type(),
      value: this.union.materialize(),
    };
  }

  public pack(): DOB0.TraitPool {
    const serialized = DOB0.SerializeTraitPool(this.materialize());
    return new DOB0.TraitPool(serialized);
  }

  public static unpack(mol: DOB0.TraitPool): TraitPool {
    const value = mol.value();
    if (value instanceof DOB0.StringVec) {
      return new TraitPool(StringVec.unpack(value));
    } else if (value instanceof DOB0.NumberVec) {
      return new TraitPool(NumberVec.unpack(value));
    } else if (value instanceof DOB0.FloatVec) {
      return new TraitPool(FloatVec.unpack(value));
    } else if (value instanceof DOB0.NumberRange) {
      return new TraitPool(NumberRange.unpack(value));
    } else if (value instanceof DOB0.FloatRange) {
      return new TraitPool(FloatRange.unpack(value));
    } else {
      throw new Error(`Unsupported type: ${mol.unionType()}`);
    }
  }
}

/**
 * @description A wrapper class for DOB0.TraitSchema
 */
export class TraitSchema {
  byteLength: number;
  traitPool: TraitPool | 'null';

  constructor(byteLength: number, traitPool: TraitPool | 'null') {
    this.byteLength = byteLength;
    this.traitPool = traitPool;
  }

  materialize(): {
    byte_length: number;
    trait_pool:
      | {
          type: string;
          value: any;
        }
      | undefined;
  } {
    return {
      byte_length: this.byteLength,
      trait_pool: this.traitPool !== 'null' ? this.traitPool.materialize() : undefined,
    };
  }

  public pack(): DOB0.TraitSchema {
    const serialized = DOB0.SerializeTraitSchema(this.materialize());
    return new DOB0.TraitSchema(serialized);
  }

  public static unpack(mol: DOB0.TraitSchema): TraitSchema {
    const traitPoolOpt = mol.getTraitPool();
    const traitPool = traitPoolOpt.hasValue() ? TraitPool.unpack(traitPoolOpt.value()) : 'null';
    return new TraitSchema(mol.getByteLength(), traitPool);
  }
}

/**
 * @description A wrapper class for DOB0.Trait
 */
export class Trait {
  name: string;
  schemaPool: Array<TraitSchema>;

  constructor(name: string, schemaPool: Array<TraitSchema>) {
    this.name = name;
    this.schemaPool = schemaPool;
  }

  materialize(): {
    name: ArrayBuffer;
    schema_pool: Array<{
      byte_length: number;
      trait_pool:
        | {
            type: string;
            value: any;
          }
        | undefined;
    }>;
  } {
    return {
      name: encoder.encode(this.name).buffer,
      schema_pool: this.schemaPool.map((schema) => schema.materialize()),
    };
  }

  public pack(): DOB0.Trait {
    const serialized = DOB0.SerializeTrait(this.materialize());
    return new DOB0.Trait(serialized);
  }

  public static unpack(mol: DOB0.Trait): Trait {
    const name = decoder.decode(mol.getName().raw());
    let schemaPool = new Array<TraitSchema>(mol.getSchemaPool().length());
    for (let i = 0; i < schemaPool.length; i++) {
      schemaPool[i] = TraitSchema.unpack(mol.getSchemaPool().indexAt(i));
    }
    return new Trait(name, schemaPool);
  }
}

/**
 * @description A wrapper class for DOB0.TraitsBase
 */
export class TraitsBase {
  traitPool: Array<Trait>;

  constructor(traitPool: Array<Trait>) {
    this.traitPool = traitPool;
  }

  materialize(): Array<{
    name: ArrayBuffer;
    schema_pool: Array<{
      byte_length: number;
      trait_pool:
        | {
            type: string;
            value: any;
          }
        | undefined;
    }>;
  }> {
    return this.traitPool.map((trait) => trait.materialize());
  }

  public pack(): DOB0.TraitsBase {
    const serialized = DOB0.SerializeTraitsBase(this.materialize());
    return new DOB0.TraitsBase(serialized);
  }

  public static unpack(mol: DOB0.TraitsBase): TraitsBase {
    let traitPool = new Array<Trait>(mol.length());
    for (let i = 0; i < traitPool.length; i++) {
      traitPool[i] = Trait.unpack(mol.indexAt(i));
    }
    return new TraitsBase(traitPool);
  }
}

export function deserailizePattern(moleculeLike: string | Uint8Array): TraitsBase {
  if (typeof moleculeLike === 'string') {
    if (!moleculeLike.startsWith('0x')) {
      moleculeLike = `0x${moleculeLike}`;
    }
    moleculeLike = bytes.bytify(moleculeLike);
  }
  const traitsBase = new DOB0.TraitsBase(moleculeLike.buffer);
  return TraitsBase.unpack(traitsBase);
}

export function serailizePattern(traitsBase: TraitsBase): ArrayBuffer;
export function serailizePattern(traitsBase: TraitsBase, format: 'hex'): string;
export function serailizePattern(traitsBase: TraitsBase, format?: unknown): unknown {
  const buffer = new Uint8Array(traitsBase.pack().view.buffer);
  switch (format) {
    case 'hex':
      return bytes.hexify(buffer).substring(2);
    default:
      return buffer;
  }
}
