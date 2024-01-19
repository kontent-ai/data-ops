import { describe, expect, it } from "@jest/globals";

import { serially } from "../../../src/utils/requests";

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
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getCurrentTime = () => performance.now();
