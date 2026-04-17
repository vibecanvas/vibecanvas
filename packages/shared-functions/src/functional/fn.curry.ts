export function fnCurry<TArgs extends unknown[], TResult>(
  func: (...args: TArgs) => TResult,
) {
  return function fnCurried(this: unknown, ...args: unknown[]) {
    if (args.length >= func.length) {
      return func.apply(this, args as unknown as TArgs);
    }

    return function (this: unknown, ...args2: unknown[]) {
      return fnCurried.apply(this, args.concat(args2));
    };
  };
}
