import { describe, expect, it } from "vitest";

import { DateLevel, serializeDateForFileName } from "../../../src/utils/files.js";

describe("serializeDateForFileName", () => {
  it.each([
    { result: "2025", level: DateLevel[DateLevel.Year] },
    { result: "2025-02", level: DateLevel[DateLevel.Month] },
    { result: "2025-02-07", level: DateLevel[DateLevel.Day] },
    { result: "2025-02-07-15", level: DateLevel[DateLevel.Hour] },
    { result: "2025-02-07-15-08", level: DateLevel[DateLevel.Minute] },
    { result: "2025-02-07-15-08-40", level: DateLevel[DateLevel.Second] },
  ])(
    "correctly serializes date 2025-02-07T15:08:40Z to $result with DateLevel $level",
    ({ result, level }) => {
      const date = new Date("2025-02-07T15:08:40Z");
      expect(serializeDateForFileName(date, DateLevel[level as keyof typeof DateLevel])).toEqual(
        result,
      );
    },
  );
});
