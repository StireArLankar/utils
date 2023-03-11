import { BehaviorSubject as _BehaviorSubject, defer, of } from "rxjs";
import {
  concatMap,
  delay,
  switchMap,
  tap,
  distinctUntilChanged,
} from "rxjs/operators";

export class BehaviorSubject<T> extends _BehaviorSubject<T> {
  next(value: T): void {
    if (this.isStopped) {
      return;
    }

    super.next(value);
  }
}

type Params<T> = {
  poll: () => Promise<T>;
  initial: T;
  delaySec?: number | (() => number);
  minCount?: number;
  isComplete: (value: T) => boolean;
  compare?: (previous: T, current: T) => boolean;
  log?: (...args: any) => void;
};

export const createStream = <T>(params: Params<T>) => {
  const {
    poll,
    initial,
    delaySec = 5,
    minCount = 0,
    isComplete,
    compare,
    log = () => {},
  } = params;

  let isNotInitialPoll = false;

  let current = initial;

  const poll$ = defer(() => {
    log("poll$");

    if (!isNotInitialPoll) {
      log({ isNotInitialPoll });
      isNotInitialPoll = true;
      return of(current);
    }

    if (isComplete1) {
      return of(current);
    }

    return defer(poll);
  });

  const data$ = new BehaviorSubject(initial);
  const result$ = new BehaviorSubject(initial);

  let mustCheck = false;

  let isComplete1 = false;

  data$
    .pipe(
      tap(() => log("load1$")),
      switchMap(() => {
        log(result$.observers.length <= minCount, result$.observers.length);

        if (result$.observers.length <= minCount) {
          // return of(data$.getValue());

          return of("").pipe(
            delay(1_000_000_000),
            concatMap((_) => of(data$.getValue()))
          );
        }

        if (mustCheck) {
          mustCheck = false;
          return poll$;
        }

        const _delaSec = typeof delaySec === "number" ? delaySec : delaySec();

        return of("").pipe(
          tap(() => log("whenToRefresh$")),
          delay(_delaSec * 1000),
          tap(() => log("whenToRefresh$", _delaSec * 1000)),
          concatMap((_) => poll$)
        );
      }),
      tap(() => log("load2$"))
    )
    .subscribe(data$);

  data$
    .pipe(
      distinctUntilChanged((prev, current) => {
        if (isComplete1) {
          return true;
        }

        if (!compare) {
          return prev === current;
        }

        return compare(prev, current);
      })
    )
    .subscribe(result$);

  data$.subscribe({
    next: (val) => {
      log("got val", `val`);

      if (isComplete1) {
        return;
      }

      if (isComplete(val)) {
        isComplete1 = true;
        Promise.resolve().then(() => data$.complete());
      }

      current = val;
    },
    complete: () => {
      log("COMPLETE");
      // return load$.complete();
    },
  });

  const _bump = {
    /** функция чтоб запустить поллинг (к примеру пришел колбек) */
    bump: () => {
      if (data$.isStopped) {
        return;
      }

      mustCheck = true;
      data$.next(current);
    },
  };

  const sub = (handler: (val: T) => void) => {
    log("SUBSCRIBE");
    if (data$.isStopped) {
      handler(current);
      return null;
    }

    const _subscription = result$.subscribe(handler);

    const subscription = Object.assign(_subscription, _bump);

    subscription.bump();

    return subscription;
  };

  return [data$, sub, _bump] as const;
};

type _Temp = ReturnType<typeof createStream>["1"];
export type CreateStreamSubscription = ReturnType<_Temp>;
