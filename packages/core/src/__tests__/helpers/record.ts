import { expect } from 'vitest';
import { Hash, OutPoint } from '@ckb-lumos/base';
import { Account } from './account';

export interface TestRecord {
  account: Account;
}
export interface IdRecord extends TestRecord {
  id: Hash;
}
export interface OutPointRecord extends TestRecord {
  outPoint: OutPoint;
}

export function popRecord<T>(records: T[], strict: true): T;
export function popRecord<T>(records: T[], strict?: false): T | undefined;
export function popRecord<T>(records: T[], strict?: unknown): T | undefined {
  const [record] = records.splice(records.length - 1, 1);
  if (strict) {
    expect(record).toBeDefined();
  }

  return record;
}

export function unshiftRecord<T>(records: T[], strict: true): T;
export function unshiftRecord<T>(records: T[], strict?: false): T | undefined;
export function unshiftRecord<T>(records: T[], strict?: unknown): T | undefined {
  const [record] = records.splice(0, 1);
  if (strict) {
    expect(record).toBeDefined();
  }

  return record;
}
