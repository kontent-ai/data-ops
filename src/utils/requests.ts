export const serially = async <Fetchers extends ReadonlyArray<() => Promise<unknown>>>(
  fetchers: Fetchers,
): Promise<FetchersReturn<Fetchers>> => {
  const results = [];
  for (const fetcher of fetchers) {
    results.push(await fetcher());
  }

  return Promise.resolve(results) as FetchersReturn<Fetchers>;
};

type PromiseValue<T extends Promise<unknown>> = T extends Promise<infer Res> ? Res : never;

type FetchersReturn<Fetchers extends ReadonlyArray<() => Promise<unknown>>> = Readonly<
  Promise<{ [key in keyof Fetchers]: PromiseValue<ReturnType<Fetchers[key]>> }>
>;
