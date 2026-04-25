export type NonEmptyReadonlyArray<T> = readonly [T, ...ReadonlyArray<T>];

export const isNonEmpty = <T>(arr: ReadonlyArray<T>): arr is NonEmptyReadonlyArray<T> =>
  arr.length > 0;
