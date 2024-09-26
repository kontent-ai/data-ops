import { notNullOrUndefined } from "./typeguards.js";

export const apply = <Input, Output>(
  fnc: (v: Input) => Output,
  value: Input | null | undefined,
): Output | null | undefined => notNullOrUndefined(value) ? fnc(value) : value;

export const not = <T>(fnc: (a: T) => boolean) => (value: T): boolean => !fnc(value);

export const second = <Original, Guarded extends Original, First, Rest extends ReadonlyArray<unknown>>(
  guard: (value: Original) => value is Guarded,
) =>
(tuple: readonly [First, Original, ...Rest]): tuple is readonly [First, Guarded, ...Rest] => guard(tuple[1]);
