import { BoundlessCache, ExpirationCache } from "transitory";
import { beforeEach, describe, it, vi, expect } from "vitest";
import { wrapRequest } from "./wrapRequest";

const BASE_DELAY = 100;

const functions = {
  delayed: async (a: number, b: number) => {
    console.log({ a, b, delayed: true });
    await new Promise((r) => setTimeout(r, BASE_DELAY));

    return a + b;
  },
  basic: async (a: number, b: number) => {
    console.log({ a, b, basic: true });
    return a + b;
  },
};

const delayedSpy = vi.spyOn(functions, "delayed");
const basicSpy = vi.spyOn(functions, "basic");

beforeEach(async () => {
  // called once before each test run
  delayedSpy.mockClear();
  basicSpy.mockClear();
});

// All tests within this suite will be run in parallel
describe("wrapRequest", () => {
  it("different input", async () => {
    const wrapped = wrapRequest(functions.delayed);

    const res1 = wrapped(1, 2);
    const res2 = wrapped(1, 5);

    expect(delayedSpy.mock.calls.length).toBe(2);
    expect(delayedSpy).toHaveBeenCalledTimes(2);
    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(6);
  });

  it("same input", async () => {
    const wrapped = wrapRequest(functions.delayed);

    const res1 = wrapped(1, 2);
    await new Promise((r) => setTimeout(r, BASE_DELAY / 2));
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(delayedSpy.mock.calls.length).toBe(1);
    expect(delayedSpy).toHaveBeenCalledTimes(1);
  });

  it("with delay", async () => {
    const wrapped = wrapRequest(functions.delayed);

    const res1 = wrapped(1, 2);
    await new Promise((r) => setTimeout(r, 2 * BASE_DELAY));
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(delayedSpy.mock.calls.length).toBe(2);
    expect(delayedSpy).toHaveBeenCalledTimes(2);
  });

  it("with sync code with await", async () => {
    const wrapped = wrapRequest(functions.basic);

    const res1 = wrapped(1, 2);
    await res1;
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(basicSpy.mock.calls.length).toBe(2);
    expect(basicSpy).toHaveBeenCalledTimes(2);
  });

  it("with sync code without await", async () => {
    const wrapped = wrapRequest(functions.basic);

    const res1 = wrapped(1, 2);
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(basicSpy.mock.calls.length).toBe(1);
    expect(basicSpy).toHaveBeenCalledTimes(1);
  });

  it("with cache", async () => {
    const wrapped = wrapRequest(
      functions.basic,
      new ExpirationCache<string, number>({
        maxWriteAge: () => 60 * 1000,
        parent: new BoundlessCache({}),
      })
    );

    const res1 = wrapped(1, 2);
    await res1;
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(basicSpy.mock.calls.length).toBe(1);
    expect(basicSpy).toHaveBeenCalledTimes(1);
  });

  it("with delay and cache", async () => {
    const wrapped = wrapRequest(
      functions.delayed,
      new ExpirationCache<string, number>({
        maxWriteAge: () => 60 * 1000,
        parent: new BoundlessCache({}),
      })
    );

    const res1 = wrapped(1, 2);
    await new Promise((r) => setTimeout(r, 1100));
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(delayedSpy.mock.calls.length).toBe(1);
    expect(delayedSpy).toHaveBeenCalledTimes(1);
  });
});
