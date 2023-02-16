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
  objectArg: async (a: { dateTime: Date; b: number }) => {
    console.log({ a, objectArg: true });
    return a.b;
  },
};

const delayedSpy = vi.spyOn(functions, "delayed");
const basicSpy = vi.spyOn(functions, "basic");
const objectArgSpy = vi.spyOn(functions, "objectArg");

beforeEach(async () => {
  // called once before each test run
  delayedSpy.mockClear();
  basicSpy.mockClear();
  objectArgSpy.mockClear();
});

// All tests within this suite will be run in parallel
describe("wrapRequest", () => {
  it("different input", async () => {
    const wrapped = wrapRequest({ fn: functions.delayed });

    const res1 = wrapped(1, 2);
    const res2 = wrapped(1, 5);

    expect(delayedSpy.mock.calls.length).toBe(2);
    expect(delayedSpy).toHaveBeenCalledTimes(2);
    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(6);
  });

  it("same input", async () => {
    const wrapped = wrapRequest({ fn: functions.delayed });

    const res1 = wrapped(1, 2);
    await new Promise((r) => setTimeout(r, BASE_DELAY / 2));
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(delayedSpy.mock.calls.length).toBe(1);
    expect(delayedSpy).toHaveBeenCalledTimes(1);
  });

  it("with delay", async () => {
    const wrapped = wrapRequest({ fn: functions.delayed });

    const res1 = wrapped(1, 2);
    await new Promise((r) => setTimeout(r, 2 * BASE_DELAY));
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(delayedSpy.mock.calls.length).toBe(2);
    expect(delayedSpy).toHaveBeenCalledTimes(2);
  });

  it("with sync code with await", async () => {
    const wrapped = wrapRequest({ fn: functions.basic });

    const res1 = wrapped(1, 2);
    await res1;
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(basicSpy.mock.calls.length).toBe(2);
    expect(basicSpy).toHaveBeenCalledTimes(2);
  });

  it("with sync code without await", async () => {
    const wrapped = wrapRequest({ fn: functions.basic });

    const res1 = wrapped(1, 2);
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(basicSpy.mock.calls.length).toBe(1);
    expect(basicSpy).toHaveBeenCalledTimes(1);
  });

  it("with cache", async () => {
    const wrapped = wrapRequest({
      fn: functions.basic,
      cache: new ExpirationCache<string, number>({
        maxWriteAge: () => 60 * 1000,
        parent: new BoundlessCache({}),
      }),
    });

    const res1 = wrapped(1, 2);
    await res1;
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(basicSpy.mock.calls.length).toBe(1);
    expect(basicSpy).toHaveBeenCalledTimes(1);
  });

  it("with delay and cache", async () => {
    const wrapped = wrapRequest({
      fn: functions.delayed,
      cache: new ExpirationCache<string, number>({
        maxWriteAge: () => 60 * 1000,
        parent: new BoundlessCache({}),
      }),
    });

    const res1 = wrapped(1, 2);
    await new Promise((r) => setTimeout(r, 1100));
    const res2 = wrapped(1, 2);

    await expect(res1).resolves.toBe(3);
    await expect(res2).resolves.toBe(3);
    expect(delayedSpy.mock.calls.length).toBe(1);
    expect(delayedSpy).toHaveBeenCalledTimes(1);
  });

  it("with sync code without await 1", async () => {
    const wrapped = wrapRequest({ fn: functions.objectArg });

    const now = new Date();
    const date1 = new Date(now);
    const date2 = new Date(now.setFullYear(now.getFullYear() + 1));

    const res1 = wrapped({ b: 1, dateTime: date1 });
    const res2 = wrapped({ b: 1, dateTime: date2 });

    await expect(res1).resolves.toBe(1);
    await expect(res2).resolves.toBe(1);
    expect(objectArgSpy.mock.calls.length).toBe(2);
    expect(objectArgSpy).toHaveBeenCalledTimes(2);
  });

  it("with sync code without await with getKee", async () => {
    const wrapped = wrapRequest({
      fn: functions.objectArg,
      createKee: ({ b }) => b.toString(),
    });

    const now = new Date();
    const date1 = new Date(now);
    const date2 = new Date(now.setFullYear(now.getFullYear() + 1));

    const res1 = wrapped({ b: 1, dateTime: date1 });
    const res2 = wrapped({ b: 1, dateTime: date2 });

    await expect(res1).resolves.toBe(1);
    await expect(res2).resolves.toBe(1);
    expect(objectArgSpy.mock.calls.length).toBe(1);
    expect(objectArgSpy).toHaveBeenCalledTimes(1);
  });
});
