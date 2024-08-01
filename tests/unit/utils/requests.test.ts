import { describe, expect, it } from "@jest/globals";

import { serially, seriallyReduce } from "../../../src/utils/requests.ts";

describe("request utils", () => {
  describe("serially", () => {
    it("Runs all fetchers serially in the order they were provided", async () => {
      const fetchers = [
        () => delay(100).then(getCurrentTime),
        () => delay(20).then(getCurrentTime),
        () => delay(0).then(getCurrentTime),
        () => delay(0).then(getCurrentTime),
      ];

      const results = await serially(fetchers);

      expect(results[0]).toBeLessThan(results[1] ?? 0);
      expect(results[1]).toBeLessThan(results[2] ?? 0);
      expect(results[2]).toBeLessThan(results[3] ?? 0);
    });

    it("Works even for an empty array of fetchers", async () => {
      const results = await serially([]);

      expect(results).toStrictEqual([]);
    });
  });

  describe.only("seriallyReduce", () => {
    it("Runs all fetchers serially in the order they were provided", async () => {
      const fetchers: ReadonlyArray<(prev: ReadonlyArray<number>) => Promise<ReadonlyArray<number>>> = [
        (prev) => delay(100).then(() => [...prev, 1]),
        (prev) => delay(20).then(() => [...prev, 2]),
        (prev) => delay(0).then(() => [...prev, 3]),
        (prev) => delay(0).then(() => [...prev, 4]),
      ];

      const result = await seriallyReduce(fetchers, []);

      expect(result).toStrictEqual([1, 2, 3, 4]);
    });

    it("Works even for an empty array of fetchers", async () => {
      const results = await seriallyReduce([], []);

      expect(results).toStrictEqual([]);
    });
  });
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getCurrentTime = () => performance.now();
