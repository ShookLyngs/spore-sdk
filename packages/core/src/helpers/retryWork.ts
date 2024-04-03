export interface RetryWorkResult<T, E = any> {
  result: T | undefined;
  success: boolean;
  errors: E[];
  retries: number;
  duration: number;
}

export interface RetryWorkIntervalContext {
  retries: number;
}

/**
 * A util function to run a getter code and retry if it fails.
 * This is useful when you're fetching changes from the internet.
 */
export function retryWork<T, E = any>(props: {
  getter: () => T | Promise<T>;
  retry?: number;
  delay?: number;
  interval?: number | ((context: RetryWorkIntervalContext) => number);
  onError?: (e: E) => boolean | Promise<boolean>;
  onComplete?: (value: T) => boolean | Promise<boolean>;
}): Promise<RetryWorkResult<T, E>> {
  const isDynamicInterval = props.interval instanceof Function;
  const staticInterval = isDynamicInterval ? 100 : (props.interval as number | undefined) ?? 100;

  const delay = props.delay ?? 0;
  const maxRetry = props.retry ?? 3;
  const onError = props.onError ?? (() => true);
  const onComplete = props.onComplete ?? (() => true);

  return new Promise<RetryWorkResult<T, E>>(async (resolve) => {
    // Record
    const startTime = Date.now();
    const errors: E[] = [];

    // Status
    let retries = 0;
    let result: T | undefined;
    let isRejected = false;
    let isCompleted = false;

    function dynamicInterval() {
      return (props.interval as (context: RetryWorkIntervalContext) => number)({
        retries,
      });
    }
    async function event(): Promise<void> {
      try {
        result = await props.getter();
        if (onComplete(result)) {
          isCompleted = true;
        } else {
          retries++;
        }
      } catch (e: any) {
        errors.push(e);
        if (await onError(e)) {
          retries++;
        } else {
          isRejected = true;
        }
      }

      if (isCompleted) {
        return resolve({
          success: true,
          result,
          errors,
          retries,
          duration: Date.now() - startTime,
        });
      }
      if (isRejected || retries >= maxRetry) {
        return resolve({
          success: false,
          result: void 0,
          errors,
          retries,
          duration: Date.now() - startTime,
        });
      }

      const interval = isDynamicInterval ? dynamicInterval() : staticInterval;
      setTimeout(() => event(), interval);
    }

    if (delay > 0) {
      await waitForMilliseconds(delay);
    }
    await event();
  });
}

export function waitForMilliseconds(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}
