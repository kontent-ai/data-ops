type OmitProps<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export const omit = <T extends object, K extends keyof T>(obj: T, props: K[]): OmitProps<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key as K))) as OmitProps<T, K>;
