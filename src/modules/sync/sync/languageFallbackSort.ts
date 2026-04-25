import { isNonEmpty, type NonEmptyReadonlyArray } from "../../../utils/nonEmpty.js";

type LanguageWithFallback = Readonly<{
  codename: string;
  fallback_language?: Readonly<{ codename?: string }>;
}>;

type DeferredFallbackUpdate = Readonly<{
  codename: string;
  fallback_language: Readonly<{ codename: string }>;
}>;

export type SortResult<T extends LanguageWithFallback> = Readonly<{
  sorted: ReadonlyArray<T>;
  deferredFallbackUpdates: ReadonlyArray<DeferredFallbackUpdate>;
}>;

/**
 * Topologically sorts languages by their fallback chain using Kahn's algorithm.
 * When a cycle is detected, breaks it by temporarily replacing one language's
 * fallback_language with the default language and recording the original fallback
 * for a deferred update after all languages are created.
 */
export const sortLanguagesByFallback = <T extends LanguageWithFallback>(
  languages: ReadonlyArray<T>,
  defaultLanguageCodename: string,
): SortResult<T> =>
  step(languages, { sorted: [], deferredFallbackUpdates: [] }, defaultLanguageCodename);

const step = <T extends LanguageWithFallback>(
  remaining: ReadonlyArray<T>,
  result: SortResult<T>,
  defaultLanguageCodename: string,
): SortResult<T> => {
  if (!isNonEmpty(remaining)) {
    return result;
  }

  const remainingCodenames = new Set(remaining.map((l) => l.codename));

  const ready = remaining.filter(
    (l) => !(l.fallback_language?.codename && remainingCodenames.has(l.fallback_language.codename)),
  );

  if (ready.length > 0) {
    const readyCodenames = new Set(ready.map((l) => l.codename));

    return step(
      remaining.filter((l) => !readyCodenames.has(l.codename)),
      { ...result, sorted: [...result.sorted, ...ready] },
      defaultLanguageCodename,
    );
  }

  // Cycle detected — find an actual cycle member and break it
  const cycleBreaker = findCycleMember(remaining);

  return step(
    remaining.filter((l) => l.codename !== cycleBreaker.codename),
    {
      sorted: [
        ...result.sorted,
        { ...cycleBreaker, fallback_language: { codename: defaultLanguageCodename } } as T,
      ],
      deferredFallbackUpdates: [
        ...result.deferredFallbackUpdates,
        ...(cycleBreaker.fallback_language?.codename
          ? [
              {
                codename: cycleBreaker.codename,
                fallback_language: { codename: cycleBreaker.fallback_language.codename },
              },
            ]
          : []),
      ],
    },
    defaultLanguageCodename,
  );
};

/**
 * Walks the fallback chain from the first remaining language until a node is
 * revisited, which identifies an actual cycle participant.
 */
const findCycleMember = <T extends LanguageWithFallback>(
  remaining: NonEmptyReadonlyArray<T>,
): T => {
  const byCodename = new Map(remaining.map((l) => [l.codename, l] as const));

  const walk = (current: T, visited: ReadonlySet<string>): T => {
    if (visited.has(current.codename)) {
      return current;
    }

    const next = current.fallback_language?.codename
      ? byCodename.get(current.fallback_language.codename)
      : undefined;

    return next ? walk(next, new Set([...visited, current.codename])) : current;
  };

  return walk(remaining[0], new Set());
};
