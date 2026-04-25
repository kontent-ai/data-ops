import { describe, expect, it } from "vitest";
import { sortLanguagesByFallback } from "../../../src/modules/sync/sync/languageFallbackSort.js";

type TestLanguage = Readonly<{
  codename: string;
  fallback_language?: Readonly<{ codename: string }>;
}>;

describe("sortLanguagesByFallback", () => {
  it("returns empty result for empty input", () => {
    const result = sortLanguagesByFallback([], "default");

    expect(result).toStrictEqual({ sorted: [], deferredFallbackUpdates: [] });
  });

  it("returns languages as-is when no fallback dependencies exist within the set", () => {
    const languages: TestLanguage[] = [
      { codename: "de_de", fallback_language: { codename: "en_us" } },
      { codename: "fr_fr", fallback_language: { codename: "en_us" } },
    ];

    const result = sortLanguagesByFallback(languages, "en_us");

    expect(result.sorted).toStrictEqual(languages);
    expect(result.deferredFallbackUpdates).toStrictEqual([]);
  });

  it("sorts languages so that fallback dependencies come first", () => {
    const languages: TestLanguage[] = [
      { codename: "fr_fr", fallback_language: { codename: "de_de" } },
      { codename: "de_de", fallback_language: { codename: "en_us" } },
    ];

    const result = sortLanguagesByFallback(languages, "en_us");

    expect(result.sorted.map((l) => l.codename)).toStrictEqual(["de_de", "fr_fr"]);
    expect(result.deferredFallbackUpdates).toStrictEqual([]);
  });

  it("handles a longer fallback chain", () => {
    const languages: TestLanguage[] = [
      { codename: "it_it", fallback_language: { codename: "fr_fr" } },
      { codename: "fr_fr", fallback_language: { codename: "de_de" } },
      { codename: "de_de", fallback_language: { codename: "en_us" } },
    ];

    const result = sortLanguagesByFallback(languages, "en_us");

    expect(result.sorted.map((l) => l.codename)).toStrictEqual(["de_de", "fr_fr", "it_it"]);
    expect(result.deferredFallbackUpdates).toStrictEqual([]);
  });

  it("breaks a two-language cycle by using default language as temporary fallback", () => {
    const languages: TestLanguage[] = [
      { codename: "a", fallback_language: { codename: "b" } },
      { codename: "b", fallback_language: { codename: "a" } },
    ];

    const result = sortLanguagesByFallback(languages, "default");

    expect(result.sorted).toHaveLength(2);
    expect(result.sorted[0]).toStrictEqual({
      codename: "a",
      fallback_language: { codename: "default" },
    });
    expect(result.sorted[1]).toStrictEqual({
      codename: "b",
      fallback_language: { codename: "a" },
    });
    expect(result.deferredFallbackUpdates).toStrictEqual([
      { codename: "a", fallback_language: { codename: "b" } },
    ]);
  });

  it("breaks a three-language cycle", () => {
    const languages: TestLanguage[] = [
      { codename: "a", fallback_language: { codename: "c" } },
      { codename: "b", fallback_language: { codename: "a" } },
      { codename: "c", fallback_language: { codename: "b" } },
    ];

    const result = sortLanguagesByFallback(languages, "default");

    expect(result.sorted.map((l) => l.codename)).toStrictEqual(["a", "b", "c"]);
    expect(result.sorted[0]?.fallback_language).toStrictEqual({ codename: "default" });
    expect(result.deferredFallbackUpdates).toStrictEqual([
      { codename: "a", fallback_language: { codename: "c" } },
    ]);
  });

  it("handles a mix of chain and cycle", () => {
    const languages: TestLanguage[] = [
      { codename: "chain_end", fallback_language: { codename: "cycle_b" } },
      { codename: "cycle_a", fallback_language: { codename: "cycle_b" } },
      { codename: "cycle_b", fallback_language: { codename: "cycle_a" } },
    ];

    const result = sortLanguagesByFallback(languages, "default");

    // Walk finds cycle_b as cycle member (chain_end → cycle_b → cycle_a → cycle_b).
    // After breaking cycle_b, both chain_end and cycle_a become ready.
    expect(result.sorted.map((l) => l.codename)).toStrictEqual(["cycle_b", "chain_end", "cycle_a"]);
    expect(result.sorted[0]?.fallback_language).toStrictEqual({ codename: "default" });
    expect(result.deferredFallbackUpdates).toStrictEqual([
      { codename: "cycle_b", fallback_language: { codename: "cycle_a" } },
    ]);
  });

  it("handles languages without fallback_language", () => {
    const languages: TestLanguage[] = [
      { codename: "a" },
      { codename: "b", fallback_language: { codename: "a" } },
    ];

    const result = sortLanguagesByFallback(languages, "default");

    expect(result.sorted.map((l) => l.codename)).toStrictEqual(["a", "b"]);
    expect(result.deferredFallbackUpdates).toStrictEqual([]);
  });
});
