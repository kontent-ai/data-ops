export type MapValues<Map extends ReadonlyMap<unknown, unknown>> = Map extends ReadonlyMap<unknown, infer Res> ? Res
  : never;
