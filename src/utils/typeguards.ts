export const notNull = <T>(arg: T | null): arg is T =>
  arg !== null;
