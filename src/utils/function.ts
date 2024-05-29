import { notNullOrUndefined } from "./typeguards.js";

export const apply = <Input, Output>(
  fnc: (v: Input) => Output,
  value: Input | null | undefined,
): Output | null | undefined => notNullOrUndefined(value) ? fnc(value) : value;

export const not = <T>(fnc: (a: T) => boolean) => (value: T): boolean => !fnc(value);
