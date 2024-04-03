import { describe, it, expect } from 'vitest';
import { waitForMilliseconds } from '../helpers';

describe('Vitest', () => {
  describe('Sequential works', () => {
    let result: number | null = null;
    it('Finish after 1 sec', async () => {
      await waitForMilliseconds(1000);
      if (result === null) {
        result = 1;
      }
    });
    it('Finish immediately', () => {
      if (result === null) {
        result = 2;
      }
    });
    it('The result should be 1', () => {
      expect(result).toEqual(1);
    });
  });
  describe('Concurrent works', () => {
    let result: number | null = null;
    describe.concurrent('Run works at the same time', () => {
      it('Finish after 1 sec', async () => {
        await waitForMilliseconds(1000);
        if (result === null) {
          result = 1;
        }
      });
      it('Finish immediately', () => {
        if (result === null) {
          result = 2;
        }
      });
    });
    it('The result should be 2', () => {
      expect(result).toEqual(2);
    });
  });
});
