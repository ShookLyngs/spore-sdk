var enc = new TextEncoder();

function dataLengthError(actual, required) {
  // throw new Error(`Invalid data length! Required: ${required}, actual: ${actual}`);
}

function assertDataLength(actual, required) {
  if (actual !== required) {
    dataLengthError(actual, required);
  }
}

function assertArrayBuffer(reader) {
  if (reader instanceof Object && reader.toArrayBuffer instanceof Function) {
    reader = reader.toArrayBuffer();
  }
  if (!(reader instanceof ArrayBuffer)) {
    throw new Error('Provided value must be an ArrayBuffer or can be transformed into ArrayBuffer!');
  }
  return reader;
}

function verifyAndExtractOffsets(view, expectedFieldCount, compatible) {
  if (view.byteLength < 4) {
    dataLengthError(view.byteLength, '>4');
  }
  const requiredByteLength = view.getUint32(0, true);
  assertDataLength(view.byteLength, requiredByteLength);
  if (requiredByteLength === 4) {
    return [requiredByteLength];
  }
  if (requiredByteLength < 8) {
    dataLengthError(view.byteLength, '>8');
  }
  const firstOffset = view.getUint32(4, true);
  if (firstOffset % 4 !== 0 || firstOffset < 8) {
    // throw new Error(`Invalid first offset: ${firstOffset}`);
  }
  const itemCount = firstOffset / 4 - 1;
  if (itemCount < expectedFieldCount) {
    // throw new Error(`Item count not enough! Required: ${expectedFieldCount}, actual: ${itemCount}`);
  } else if (!compatible && itemCount > expectedFieldCount) {
    // throw new Error(`Item count is more than required! Required: ${expectedFieldCount}, actual: ${itemCount}`);
  }
  if (requiredByteLength < firstOffset) {
    // throw new Error(`First offset is larger than byte length: ${firstOffset}`);
  }
  const offsets = [];
  for (let i = 0; i < itemCount; i++) {
    const start = 4 + i * 4;
    offsets.push(view.getUint32(start, true));
  }
  offsets.push(requiredByteLength);
  for (let i = 0; i < offsets.length - 1; i++) {
    if (offsets[i] > offsets[i + 1]) {
      // throw new Error(`Offset index ${i}: ${offsets[i]} is larger than offset index ${i + 1}: ${offsets[i + 1]}`);
    }
  }
  return offsets;
}

function serializeTable(buffers) {
  const itemCount = buffers.length;
  let totalSize = 4 * (itemCount + 1);
  const offsets = [];

  for (let i = 0; i < itemCount; i++) {
    offsets.push(totalSize);
    totalSize += buffers[i].byteLength;
  }

  const buffer = new ArrayBuffer(totalSize);
  const array = new Uint8Array(buffer);
  const view = new DataView(buffer);

  view.setUint32(0, totalSize, true);
  for (let i = 0; i < itemCount; i++) {
    view.setUint32(4 + i * 4, offsets[i], true);
    array.set(new Uint8Array(buffers[i]), offsets[i]);
  }
  return buffer;
}

class String {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    if (this.view.byteLength < 4) {
      dataLengthError(this.view.byteLength, '>4');
    }
    const requiredByteLength = this.length() + 4;
    assertDataLength(this.view.byteLength, requiredByteLength);
  }

  raw() {
    return this.view.buffer.slice(4);
  }

  indexAt(i) {
    return this.view.getUint8(4 + i);
  }

  length() {
    return this.view.getUint32(0, true);
  }
}

function SerializeString(value) {
  const item = assertArrayBuffer(value);
  const array = new Uint8Array(4 + item.byteLength);
  new DataView(array.buffer).setUint32(0, item.byteLength, true);
  array.set(new Uint8Array(item), 4);
  return array.buffer;
}

class StringVec {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    const offsets = verifyAndExtractOffsets(this.view, 0, true);
    for (let i = 0; i < offsets.length - 1; i++) {
      new String(this.view.buffer.slice(offsets[i], offsets[i + 1]), { validate: false }).validate();
    }
  }

  length() {
    if (this.view.byteLength < 8) {
      return 0;
    } else {
      return this.view.getUint32(4, true) / 4 - 1;
    }
  }

  indexAt(i) {
    const start = 4 + i * 4;
    const offset = this.view.getUint32(start, true);
    let offset_end = this.view.byteLength;
    if (i + 1 < this.length()) {
      offset_end = this.view.getUint32(start + 4, true);
    }
    return new String(this.view.buffer.slice(offset, offset_end), { validate: false });
  }
}

function SerializeStringVec(value) {
  return serializeTable(value.map((item) => SerializeString(item)));
}

class Number {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    assertDataLength(this.view.byteLength, 8);
  }

  indexAt(i) {
    return this.view.getUint8(i);
  }

  raw() {
    return this.view.buffer;
  }

  static size() {
    return 8;
  }
}

function SerializeNumber(value) {
  const buffer = assertArrayBuffer(value);
  assertDataLength(buffer.byteLength, 8);
  return buffer;
}

class NumberRange {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    assertDataLength(this.view.byteLength, Number.size() * 2);
    for (let i = 0; i < 2; i++) {
      const item = this.indexAt(i);
      item.validate(compatible);
    }
  }

  indexAt(i) {
    return new Number(this.view.buffer.slice(i * Number.size(), (i + 1) * Number.size(), { validate: false }));
  }

  static size() {
    return Number.size() * 2;
  }
}

function SerializeNumberRange(value) {
  const array = new Uint8Array(Number.size() * value.length);
  for (let i = 0; i < value.length; i++) {
    const itemBuffer = SerializeNumber(value[i]);
    array.set(new Uint8Array(itemBuffer), i * Number.size());
  }
  return array.buffer;
}

class NumberVec {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    if (this.view.byteLength < 4) {
      dataLengthError(this.view.byteLength, '>4');
    }
    const requiredByteLength = this.length() * Number.size() + 4;
    assertDataLength(this.view.byteLength, requiredByteLength);
    for (let i = 0; i < 0; i++) {
      const item = this.indexAt(i);
      item.validate(compatible);
    }
  }

  indexAt(i) {
    return new Number(this.view.buffer.slice(4 + i * Number.size(), 4 + (i + 1) * Number.size()), { validate: false });
  }

  length() {
    return this.view.getUint32(0, true);
  }
}

function SerializeNumberVec(value) {
  const array = new Uint8Array(4 + Number.size() * value.length);
  new DataView(array.buffer).setUint32(0, value.length, true);
  for (let i = 0; i < value.length; i++) {
    const itemBuffer = SerializeNumber(value[i]);
    array.set(new Uint8Array(itemBuffer), 4 + i * Number.size());
  }
  return array.buffer;
}

class FloatVec {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    const offsets = verifyAndExtractOffsets(this.view, 0, true);
    new NumberVec(this.view.buffer.slice(offsets[0], offsets[1]), { validate: false }).validate();
    new Number(this.view.buffer.slice(offsets[1], offsets[2]), { validate: false }).validate();
  }

  getNumeratorVec() {
    const start = 4;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.getUint32(start + 4, true);
    return new NumberVec(this.view.buffer.slice(offset, offset_end), { validate: false });
  }

  getDenominator() {
    const start = 8;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.byteLength;
    return new Number(this.view.buffer.slice(offset, offset_end), { validate: false });
  }
}

function SerializeFloatVec(value) {
  const buffers = [];
  buffers.push(SerializeNumberVec(value.numerator_vec));
  buffers.push(SerializeNumber(value.denominator));
  return serializeTable(buffers);
}

class FloatRange {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    const offsets = verifyAndExtractOffsets(this.view, 0, true);
    new NumberRange(this.view.buffer.slice(offsets[0], offsets[1]), { validate: false }).validate();
    new Number(this.view.buffer.slice(offsets[1], offsets[2]), { validate: false }).validate();
  }

  getNumeratorRange() {
    const start = 4;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.getUint32(start + 4, true);
    return new NumberRange(this.view.buffer.slice(offset, offset_end), { validate: false });
  }

  getDenominator() {
    const start = 8;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.byteLength;
    return new Number(this.view.buffer.slice(offset, offset_end), { validate: false });
  }
}

function SerializeFloatRange(value) {
  const buffers = [];
  buffers.push(SerializeNumberRange(value.numerator_range));
  buffers.push(SerializeNumber(value.denominator));
  return serializeTable(buffers);
}

class TraitPool {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    if (this.view.byteLength < 4) {
      assertDataLength(this.view.byteLength, '>4');
    }
    const t = this.view.getUint32(0, true);
    switch (t) {
      case 0:
        new StringVec(this.view.buffer.slice(4), { validate: false }).validate();
        break;
      case 1:
        new NumberVec(this.view.buffer.slice(4), { validate: false }).validate();
        break;
      case 2:
        new FloatVec(this.view.buffer.slice(4), { validate: false }).validate();
        break;
      case 3:
        new NumberRange(this.view.buffer.slice(4), { validate: false }).validate();
        break;
      case 4:
        new FloatRange(this.view.buffer.slice(4), { validate: false }).validate();
        break;
      default:
        throw new Error(`Invalid type: ${t}`);
    }
  }

  unionType() {
    const t = this.view.getUint32(0, true);
    switch (t) {
      case 0:
        return 'StringVec';
      case 1:
        return 'NumberVec';
      case 2:
        return 'FloatVec';
      case 3:
        return 'NumberRange';
      case 4:
        return 'FloatRange';
      default:
        throw new Error(`Invalid type: ${t}`);
    }
  }

  value() {
    const t = this.view.getUint32(0, true);
    switch (t) {
      case 0:
        return new StringVec(this.view.buffer.slice(4), { validate: false });
      case 1:
        return new NumberVec(this.view.buffer.slice(4), { validate: false });
      case 2:
        return new FloatVec(this.view.buffer.slice(4), { validate: false });
      case 3:
        return new NumberRange(this.view.buffer.slice(4), { validate: false });
      case 4:
        return new FloatRange(this.view.buffer.slice(4), { validate: false });
      default:
        throw new Error(`Invalid type: ${t}`);
    }
  }
}

function SerializeTraitPool(value) {
  switch (value.type) {
    case 'StringVec': {
      const itemBuffer = SerializeStringVec(value.value);
      const array = new Uint8Array(4 + itemBuffer.byteLength);
      const view = new DataView(array.buffer);
      view.setUint32(0, 0, true);
      array.set(new Uint8Array(itemBuffer), 4);
      return array.buffer;
    }
    case 'NumberVec': {
      const itemBuffer = SerializeNumberVec(value.value);
      const array = new Uint8Array(4 + itemBuffer.byteLength);
      const view = new DataView(array.buffer);
      view.setUint32(0, 1, true);
      array.set(new Uint8Array(itemBuffer), 4);
      return array.buffer;
    }
    case 'FloatVec': {
      const itemBuffer = SerializeFloatVec(value.value);
      const array = new Uint8Array(4 + itemBuffer.byteLength);
      const view = new DataView(array.buffer);
      view.setUint32(0, 2, true);
      array.set(new Uint8Array(itemBuffer), 4);
      return array.buffer;
    }
    case 'NumberRange': {
      const itemBuffer = SerializeNumberRange(value.value);
      const array = new Uint8Array(4 + itemBuffer.byteLength);
      const view = new DataView(array.buffer);
      view.setUint32(0, 3, true);
      array.set(new Uint8Array(itemBuffer), 4);
      return array.buffer;
    }
    case 'FloatRange': {
      const itemBuffer = SerializeFloatRange(value.value);
      const array = new Uint8Array(4 + itemBuffer.byteLength);
      const view = new DataView(array.buffer);
      view.setUint32(0, 4, true);
      array.set(new Uint8Array(itemBuffer), 4);
      return array.buffer;
    }
    default:
      throw new Error(`Invalid type: ${value.type}`);
  }
}

class TraitPoolOpt {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    if (this.hasValue()) {
      this.value().validate(compatible);
    }
  }

  value() {
    return new TraitPool(this.view.buffer, { validate: false });
  }

  hasValue() {
    return this.view.byteLength > 0;
  }
}

function SerializeTraitPoolOpt(value) {
  if (value) {
    return SerializeTraitPool(value);
  } else {
    return new ArrayBuffer(0);
  }
}

class TraitSchema {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    const offsets = verifyAndExtractOffsets(this.view, 0, true);
    if (offsets[1] - offsets[0] !== 1) {
      // throw new Error(`Invalid offset for byte_length: ${offsets[0]} - ${offsets[1]}`)
    }
    new TraitPoolOpt(this.view.buffer.slice(offsets[1], offsets[2]), { validate: false }).validate();
  }

  getByteLength() {
    const start = 4;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.getUint32(start + 4, true);
    return new DataView(this.view.buffer.slice(offset, offset_end)).getUint8(0);
  }

  getTraitPool() {
    const start = 8;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.byteLength;
    return new TraitPoolOpt(this.view.buffer.slice(offset, offset_end), { validate: false });
  }
}

function SerializeTraitSchema(value) {
  const buffers = [];
  const byteLengthView = new DataView(new ArrayBuffer(1));
  byteLengthView.setUint8(0, value.byte_length);
  buffers.push(byteLengthView.buffer);
  buffers.push(SerializeTraitPoolOpt(value.trait_pool));
  return serializeTable(buffers);
}

class TraitSchemaVec {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    const offsets = verifyAndExtractOffsets(this.view, 0, true);
    for (let i = 0; i < offsets.length - 1; i++) {
      new TraitSchema(this.view.buffer.slice(offsets[i], offsets[i + 1]), { validate: false }).validate();
    }
  }

  length() {
    if (this.view.byteLength < 8) {
      return 0;
    } else {
      return this.view.getUint32(4, true) / 4 - 1;
    }
  }

  indexAt(i) {
    const start = 4 + i * 4;
    const offset = this.view.getUint32(start, true);
    let offset_end = this.view.byteLength;
    if (i + 1 < this.length()) {
      offset_end = this.view.getUint32(start + 4, true);
    }
    return new TraitSchema(this.view.buffer.slice(offset, offset_end), { validate: false });
  }
}

function SerializeTraitSchemaVec(value) {
  return serializeTable(value.map((item) => SerializeTraitSchema(item)));
}

class Trait {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    const offsets = verifyAndExtractOffsets(this.view, 0, true);
    new String(this.view.buffer.slice(offsets[0], offsets[1]), { validate: false }).validate();
    new TraitSchemaVec(this.view.buffer.slice(offsets[1], offsets[2]), { validate: false }).validate();
  }

  getName() {
    const start = 4;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.getUint32(start + 4, true);
    return new String(this.view.buffer.slice(offset, offset_end), { validate: false });
  }

  getSchemaPool() {
    const start = 8;
    const offset = this.view.getUint32(start, true);
    const offset_end = this.view.byteLength;
    return new TraitSchemaVec(this.view.buffer.slice(offset, offset_end), { validate: false });
  }
}

function SerializeTrait(value) {
  const buffers = [];
  buffers.push(SerializeString(value.name));
  buffers.push(SerializeTraitSchemaVec(value.schema_pool));
  return serializeTable(buffers);
}

class TraitsBase {
  constructor(reader, { validate = true } = {}) {
    this.view = new DataView(assertArrayBuffer(reader));
    if (validate) {
      this.validate();
    }
  }

  validate(compatible = false) {
    const offsets = verifyAndExtractOffsets(this.view, 0, true);
    for (let i = 0; i < offsets.length - 1; i++) {
      new Trait(this.view.buffer.slice(offsets[i], offsets[i + 1]), { validate: false }).validate();
    }
  }

  length() {
    if (this.view.byteLength < 8) {
      return 0;
    } else {
      return this.view.getUint32(4, true) / 4 - 1;
    }
  }

  indexAt(i) {
    const start = 4 + i * 4;
    const offset = this.view.getUint32(start, true);
    let offset_end = this.view.byteLength;
    if (i + 1 < this.length()) {
      offset_end = this.view.getUint32(start + 4, true);
    }
    return new Trait(this.view.buffer.slice(offset, offset_end), { validate: false });
  }
}

function SerializeTraitsBase(value) {
  return serializeTable(value.map((item) => SerializeTrait(item)));
}

module.exports = {
  String,
  SerializeString,
  StringVec,
  SerializeStringVec,
  Number,
  SerializeNumber,
  NumberRange,
  SerializeNumberRange,
  NumberVec,
  SerializeNumberVec,
  FloatVec,
  SerializeFloatVec,
  FloatRange,
  SerializeFloatRange,
  TraitPool,
  SerializeTraitPool,
  TraitSchema,
  SerializeTraitSchema,
  TraitSchemaVec,
  SerializeTraitSchemaVec,
  Trait,
  SerializeTrait,
  TraitsBase,
  SerializeTraitsBase,
};
