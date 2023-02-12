import { Cache } from "transitory";

export const wrapRequest = <
  R,
  Args extends any[],
  T extends (...args: Args) => Promise<R>
>(
  fn: T,
  cache?: Cache<string, R>
): T => {
  const promiseMap = new Map<string, Promise<R>>();

  const request = async (...args: Args) => {
    const kee = JSON.stringify(args);

    const resultFromCache = cache?.getIfPresent(kee);

    if (resultFromCache) {
      return resultFromCache;
    }

    const tempPromise = promiseMap.get(kee);

    if (tempPromise) {
      return tempPromise;
    }

    const promise = fn(...args);

    promiseMap.set(kee, promise);

    try {
      const res = await promise;

      promiseMap.delete(kee);

      cache?.set(kee, res);

      return res;
    } catch (e) {
      promiseMap.delete(kee);

      throw e;
    }
  };

  return request as T;
};
