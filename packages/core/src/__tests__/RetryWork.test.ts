import { describe, expect, it } from 'vitest';
import { retryWork, waitForMilliseconds } from '../helpers';

describe('RetryWork', () => {
  it('Return 1', async () => {
    const work = await retryWork({
      getter: async () => {
        await waitForMilliseconds(1);
        return 1;
      },
    });

    expect(work.success).eq(true);
    expect(work.retries).eq(0);
    expect(work.result).eq(1);
  });
  it('Return 1 after 3 retries', async () => {
    let retries = 0;
    const work = await retryWork({
      getter: async () => {
        await waitForMilliseconds(1);
        if (retries < 3) {
          retries++;
          throw new Error('Should retry 3 times');
        }
        return 1;
      },
      retry: 10,
    });

    expect(work.success).eq(true);
    expect(work.retries).eq(retries);
    expect(work.result).eq(1);
  });
  it('Fail after 3 retries', async () => {
    const work = await retryWork({
      getter: async () => {
        await waitForMilliseconds(1);
        throw new Error('Failed');
      },
      retry: 3,
      interval: 1000,
    });

    expect(work.success).eq(false);
    expect(work.result).eq(void 0);
    expect(work.retries).eq(3);
  });
  it('Return 1 but fail', async () => {
    const work = await retryWork({
      getter: async () => {
        await waitForMilliseconds(1);
        return 1;
      },
      onComplete() {
        return false;
      },
    });

    expect(work.success).eq(false);
    expect(work.result).eq(void 0);
  });
  it('Return 1 but stop', async () => {
    const work = await retryWork({
      getter: async () => {
        await waitForMilliseconds(1);
        return 1;
      },
      onComplete() {
        throw new Error('Should stop');
      },
      onError() {
        return false;
      },
    });

    expect(work.success).eq(false);
    expect(work.result).eq(void 0);
    expect(work.retries).eq(0);
  });
  it('Fail and stop', async () => {
    const work = await retryWork({
      getter: async () => {
        await waitForMilliseconds(1);
        throw new Error('Failed');
      },
      onError() {
        return false;
      },
    });

    expect(work.success).eq(false);
    expect(work.result).eq(void 0);
    expect(work.retries).eq(0);
  });
});
