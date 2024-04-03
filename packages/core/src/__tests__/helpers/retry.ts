import { retryWork } from '../../helpers';

export async function retryQuery<T>(getter: () => T | Promise<T>): Promise<T> {
  const work = await retryWork({
    getter,
    retry: 8,
    interval: 10000,
  });

  if (!work.success) {
    if (work.errors.length > 0) {
      throw new Error(`RetryWork failed for ${work.retries} times`, {
        cause: work.errors.pop(),
      });
    } else {
      throw new Error(`RetryWork failed with no error for ${work.retries} times`);
    }
  }

  return work.result as T;
}
