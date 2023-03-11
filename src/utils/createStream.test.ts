import { distinctUntilChanged, Subject, takeUntil, takeWhile } from "rxjs";
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
      invoke1: (_: number) => {},
    };

    const spy = vi.spyOn(obj, "invoke");
    const spy1 = vi.spyOn(obj, "invoke1");

    const [subj, subscribe] = createStream({
      initial: 0,
      isComplete: (value) => value >= 5,
      compare: (previous, current) => previous === current,
      // log: (...args) => console.log(new Date().toISOString(), ...args),
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

    subj.pipe().subscribe((val) => {
      obj.invoke1(val);
      // console.log("second subscriber", val);
    });

    const promise = new Promise<void>((resolve) => {
      subscribe((val) => {
        obj.invoke(val);
        // console.log("first subscriber", val);

        if (val === 5) {
          resolve();
        }
      });
    });

    await wait(500);
    expect(count).toBe(1);

    await promise;

    const [seconds] = process.hrtime(start);

    await wait(0);

    expect(spy).toHaveBeenCalledTimes(6);
    expect(spy).toHaveBeenLastCalledWith(5);
    expect(spy1).toHaveBeenLastCalledWith(5);

    expect(subj.isStopped).toBe(true);
    expect(seconds).lessThan(3);
    expect(count).toBe(5);
  });

  it("ignores values after complete", async () => {
    let count = 0;

    const obj = {
      // invoke: (count: number) => console.log({ count }),
      invoke: (_: number) => {},
      invoke1: (_: number) => {},
      invoke4: (_: number) => {},
      invoke5: (_: number) => {},
    };

    const spy = vi.spyOn(obj, "invoke");
    const spy1 = vi.spyOn(obj, "invoke1");
    const spy4 = vi.spyOn(obj, "invoke4");
    const spy5 = vi.spyOn(obj, "invoke5");

    const isComplete = (value: number) => value >= 5;

    const [subj, subscribe] = createStream({
      initial: 0,
      isComplete,
      compare: (previous, current) => previous === current,
      poll: async () => count,
      delaySec: 0.3,
    });

    const takeUntil$ = new Subject();

    subj
      .pipe(
        distinctUntilChanged(),
        // takeUntil(takeUntil$)
        takeWhile((val) => !isComplete(val), true)
      )
      .subscribe((val) => {
        if (isComplete(val)) {
          takeUntil$.next("");
        }

        obj.invoke1(val);
        console.log("second subscriber", val);
      });

    subj.subscribe({
      complete: () => {
        console.log("complete");
      },
    });

    subj.next(3);
    subj.next(4);
    subj.next(5);
    subj.next(6);

    expect(subj.getValue()).toBe(6);

    subscribe((val) => {
      obj.invoke(val);
      console.log("first subscriber", val);
    });

    subj.pipe(distinctUntilChanged()).subscribe((val) => {
      console.log("third subscriber", val);
    });

    const promise = new Promise<void>((complete) => {
      subj.subscribe({ complete });
    });

    await promise;

    subj.pipe(distinctUntilChanged()).subscribe((val) => {
      obj.invoke4(val);
      console.log("fourth subscriber", val);
    });

    subscribe((val) => {
      obj.invoke5(val);
      console.log("fifth subscriber", val);
    });

    await wait(0);

    expect(spy).toHaveBeenLastCalledWith(5);
    expect(spy1).toHaveBeenLastCalledWith(5);
    expect(spy4).toHaveBeenCalledTimes(0);
    expect(spy5).toHaveBeenLastCalledWith(5);
    // after bumps...
    expect(subj.getValue()).toBe(5);
    expect(subj.isStopped).toBe(true);
  });
});
