import type { ObjectFromTuple, SuperiorOmit } from "./types.js";

export const omit = <T extends object, K extends keyof T>(obj: T, props: K[]): SuperiorOmit<T, K> =>
  Object.fromEntries(
    Object.entries(obj).filter(([key]) => !props.includes(key as K)),
  ) as SuperiorOmit<T, K>;

export const removeNulls = (value: unknown): unknown => {
  if (value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map(removeNulls);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      removeNulls(Object.entries(value)) as ReadonlyArray<[string, unknown]>,
    );
  }

  return value;
};
type ObjectPerKey<Key extends string, Value> = Key extends unknown ? { [k in Key]: Value } : never;

export const makeObjectWithKey = <Key extends string, Value>(
  key: Key,
  value: Value,
): ObjectPerKey<Key, Value> => ({ [key]: value }) as ObjectPerKey<Key, Value>;

export const superiorFromEntries = <InputType extends readonly (readonly [string, unknown])[]>(
  entries: InputType,
): ObjectFromTuple<InputType> => Object.fromEntries(entries) as ObjectFromTuple<InputType>;
