import { Cache } from "transitory";

interface WrapRequestParams<T extends (...args: any[]) => Promise<any>> {
  fn: T;
  cache?: Cache<string, Awaited<ReturnType<T>>>;
  createKee?: (...args: Parameters<T>) => string;
}

export const wrapRequest = <T extends (...args: any[]) => Promise<any>>(
  params: WrapRequestParams<T>
): T => {
  const { fn, cache, createKee } = params;

  type R = Awaited<ReturnType<T>>;
  const promiseMap = new Map<string, Promise<R>>();

  const request = async (...args: Parameters<T>) => {
    const kee = createKee ? createKee(...args) : JSON.stringify(args);

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
