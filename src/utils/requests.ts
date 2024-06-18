export const serially = async <Fetchers extends ReadonlyArray<() => Promise<unknown>>>(
  fetchers: Fetchers,
): Promise<FetchersReturn<Fetchers>> => {
  const results = [];
  for (const fetcher of fetchers) {
    results.push(await fetcher());
  }

  return Promise.resolve(results) as FetchersReturn<Fetchers>;
};

export const seriallyReduce = async <ReturnType>(
  fetchers: ReadonlyArray<(prevValue: ReturnType) => Promise<ReturnType>>,
  initialValue: ReturnType,
): Promise<ReturnType> => {
  if (!fetchers.length) {
    return initialValue;
  }

  let result = initialValue;
  for (const fetcher of fetchers) {
    result = await fetcher(result);
  }

  return Promise.resolve(result);
};

type PromiseValue<T extends Promise<unknown>> = T extends Promise<infer Res> ? Res : never;

type FetchersReturn<Fetchers extends ReadonlyArray<() => Promise<unknown>>> = Readonly<
  { [key in keyof Fetchers]: PromiseValue<ReturnType<Fetchers[key]>> }
>;
