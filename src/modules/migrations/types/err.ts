export type Err = { err: unknown };

export type ErrorLike<T> = T | Err;

export const isErr = (entity: ErrorLike<unknown>): entity is Err =>
  typeof entity === "object" && entity !== null && "err" in entity;
