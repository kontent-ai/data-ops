import { SuperiorOmit } from "./types.js";

export const omit = <T extends object, K extends keyof T>(obj: T, props: K[]): SuperiorOmit<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key as K))) as SuperiorOmit<T, K>;
