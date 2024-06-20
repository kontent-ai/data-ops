import { describe, expect, it } from "@jest/globals";

import { parseRange, validateRange } from "../../../src/modules/migrations/utils/rangeUtils";

describe("parseRange", () => {
  it("should return an error for bad range format", () => {
    expect(parseRange("T2023-01-01")).toEqual({ error: "Bad range format" });
    expect(parseRange("T202:")).toEqual({ error: "T202 is not a valid order format." });
    expect(parseRange("Tfdsa:")).toEqual({ error: "Tfdsa is not a valid order format." });
    expect(parseRange("T2024:T202")).toEqual({ error: "T202 is not a valid order format." });
    expect(parseRange("T2024-0:T202")).toEqual({ error: "T2024-0 is not a valid order format." });
    expect(parseRange("T2024-04:2024-05")).toEqual({ error: "2024-05 is not a valid order format." });
    expect(parseRange("T2023-01-01:2023-01-01:2023-01-01")).toEqual({ error: "Bad range format" });
  });

  it("should parse ranges correctly", () => {
    expect(parseRange("1:10")).toEqual({ from: 1, to: 10 });
    expect(parseRange(":T2023-01-01")).toEqual({ from: 0, to: new Date("2023-01-01T00:00:00Z") });
    expect(parseRange("0:T2023-01-01")).toEqual({ from: 0, to: new Date("2023-01-01T00:00:00Z") });
    expect(parseRange("10:T2023-01-01")).toEqual({ from: 10, to: new Date("2023-01-01T00:00:00Z") });
    expect(parseRange("T2024:T2024-01-01")).toEqual({ from: new Date("2024"), to: new Date("2024-01-01T00:00:00Z") });
    expect(parseRange("T2024-01-01:T2024-01-02")).toEqual({
      from: new Date("2024-01-01"),
      to: new Date("2024-01-02T00:00:00Z"),
    });
    expect(parseRange("T2024:")).toEqual({ from: new Date("2024"), to: new Date("9999-12-31") });
    expect(parseRange(":10")).toEqual({ from: 0, to: 10 });
    expect(parseRange("2:")).toEqual({ from: 2, to: new Date("9999-12-31") });
    expect(parseRange(":")).toEqual({ from: 0, to: new Date("9999-12-31") });
  });

  it("should return an error for invalid date formats", () => {
    expect(parseRange("T2023-13-01:T2023-01-02")).toEqual({ error: "T2023-13-01 is invalid Date." });
    expect(parseRange("T2023-01-01:T2023-01-32")).toEqual({ error: "T2023-01-32 is invalid Date." });
  });
});

describe("validateRange", () => {
  it("should return an error for invalid order format", () => {
    const err = { error: "Left sight of range can't be bigger than right side!" };

    expect(validateRange({ from: new Date("2024-01-01T03:00Z"), to: new Date("2024-01-01T00:00Z") })).toEqual(err);
    expect(validateRange({ from: new Date("2024-01-02T03:05:00Z"), to: new Date("2024-01-02T03:04:59Z") }))
      .toEqual(err);
    expect(validateRange({ from: new Date("2024-01-01T00:00Z"), to: new Date("2023-12-31T00:00Z") }))
      .toEqual(err);
    expect(validateRange({ from: 5, to: 2 })).toEqual(err);
    expect(validateRange({ from: new Date("2024"), to: 1 })).toEqual(err);
  });
});
