export const zip = <T1 extends ReadonlyArray<unknown>, T2 extends ReadonlyArray<unknown>>(
  arr1: T1,
  arr2: T2,
): Zip<T1, T2> =>
  arr1
    .slice(0, Math.min(arr1.length, arr2.length))
    .map((el1, i) => [el1, arr2[i]] as const) as unknown as Zip<T1, T2>;

type Zip<T1 extends ReadonlyArray<unknown>, T2 extends ReadonlyArray<unknown>> = true extends
  | IsEmptyTuple<T1>
  | IsEmptyTuple<T2>
  ? readonly []
  : [IsNonEmptyTuple<T1>, IsNonEmptyTuple<T2>] extends [true, true]
    ? ZipTuples<T1, T2>
    : ZipArrays<T1, T2>;

type IsEmptyTuple<T extends ReadonlyArray<unknown>> = T extends readonly [] ? true : false;

type IsNonEmptyTuple<T extends ReadonlyArray<unknown>> = T extends readonly [
  unknown,
  ...ReadonlyArray<unknown>,
]
  ? true
  : false;

/**
 * Handles zip of two types where at least one is an array of unknown length.
 */
type ZipArrays<
  T1 extends ReadonlyArray<unknown>,
  T2 extends ReadonlyArray<unknown>,
> = ReadonlyArray<readonly [T1[number], T2[number]]>;

/**
 * Handles zip of two tuples (arrays of known length and exact types for different positions).
 * This type expects two tuples and doesn't work well with arrays of unknown length.
 */
type ZipTuples<
  T1 extends ReadonlyArray<unknown>,
  T2 extends ReadonlyArray<unknown>,
  Accum extends ReadonlyArray<readonly [unknown, unknown]> = readonly [],
> = [T1, T2] extends [
  readonly [infer First1, ...infer Rest1 extends ReadonlyArray<unknown>],
  readonly [infer First2, ...infer Rest2 extends ReadonlyArray<unknown>],
]
  ? ZipTuples<Rest1, Rest2, readonly [...Accum, readonly [First1, First2]]>
  : Accum;
