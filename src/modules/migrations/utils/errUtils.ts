import { type LogOptions, logError } from "../../../log.js";

type Err = { err: unknown };

export type WithErr<Value> = { value: Value } | Err;

export const handleErr = <T>(entity: WithErr<T>, logOptions: LogOptions, message?: string) => {
  if ("err" in entity) {
    logError(
      logOptions,
      `${message ?? ""}${entity.err instanceof Error ? entity.err.message : JSON.stringify(entity.err)}`,
    );

    throw new Error(
      `${message ?? ""}${JSON.stringify(entity.err, Object.getOwnPropertyNames(entity.err))}`,
    );
  }

  return entity.value;
};
