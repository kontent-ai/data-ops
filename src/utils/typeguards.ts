export const notNull = <T>(arg: T | null): arg is T =>
  arg !== null;

export const notNullOrUndefined = <T>(arg: T | undefined | null): arg is T =>
  arg !== undefined && arg !== null;
