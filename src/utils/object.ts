export const omit = <T extends object, K extends keyof T>(obj: T, props: K[]): Omit<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key as K))) as Omit<T, K>;
