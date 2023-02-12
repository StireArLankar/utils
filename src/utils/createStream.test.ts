import { describe, expect, it, vi } from "vitest";
import { createStream } from "./createStream";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// All tests within this suite will be run in parallel
describe("createStream", () => {
  it("basic", async () => {
    let count = 0;

    let shouldRecieveSameValue = true;

    const obj = {
      // invoke: (count: number) => console.log({ count }),
      invoke: (_: number) => {},
    };

    const spy = vi.spyOn(obj, "invoke");

    const [subj, subscribe] = createStream({
      initial: 0,
      isComplete: (value) => value >= 5,
      compare: (previous, current) => previous === current,
      poll: () =>
        new Promise<number>((resolve) =>
          setTimeout(() => {
            if (count === 3 && shouldRecieveSameValue) {
              shouldRecieveSameValue = false;
              return resolve(count);
            }

            count = count + 1;

            return resolve(count);
          }, 100)
        ),
      delaySec: 0.3,
    });

    // no change until first subscriber
    await wait(200);
    expect(count).toBe(0);
    await wait(500);
    expect(count).toBe(0);

    const start = process.hrtime();

    const promise = new Promise<void>((resolve) => {
      subscribe((val) => {
        obj.invoke(val);

        if (val === 5) {
          resolve();
        }
      });
    });

    await wait(500);
    expect(count).toBe(1);

    await promise;

    const [seconds] = process.hrtime(start);

    expect(spy).toHaveBeenCalledTimes(6);
    expect(subj.isStopped).toBe(true);
    expect(seconds).lessThan(3);
    expect(count).toBe(5);
  });
});
