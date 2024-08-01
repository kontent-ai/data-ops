import { describe, expect, it } from "@jest/globals";

import { parseRange, validateRange } from "../../../src/modules/migrations/utils/rangeUtils.ts";

describe("parseRange", () => {
  [
    { range: "T2023-01-01", err: "Bad range format" },
    { range: "T202:", err: "T202 is not a valid order format." },
    { range: "Tfdsa:", err: "Tfdsa is not a valid order format." },
    { range: "T2024:T202", err: "T202 is not a valid order format." },
    { range: "T2024-0:T,02", err: "T2024-0 is not a valid order format." },
    { range: "T2024-04:2024-05", err: "2024-05 is not a valid order format." },
    { range: "T2023-01-01:2023-01-01:2023-01-01", err: "Bad range format" },
  ].forEach(({ range, err }) => {
    it("should return an error for bad range format", () => {
      expect(parseRange(range)).toEqual({ err });
    });
  });

  [
    { input: "1:10", result: { from: 1, to: 10 } },
    { input: ":T2023-01-01", result: { from: 0, to: new Date("2023-01-01T00:00:00Z") } },
    { input: "0:T2023-01-01", result: { from: 0, to: new Date("2023-01-01T00:00:00Z") } },
    { input: "10:T2023-01-01", result: { from: 10, to: new Date("2023-01-01T00:00:00Z") } },
    { input: "T2024:T2024-01-01", result: { from: new Date("2024"), to: new Date("2024-01-01T00:00:00Z") } },
    {
      input: "T2024-01-01:T2024-01-02",
      result: { from: new Date("2024-01-01"), to: new Date("2024-01-02T00:00:00Z") },
    },
    {
      input: "T2024-01-01-08-20-40:T2024-01-02-09-30-45",
      result: { from: new Date("2024-01-01T08:20:40Z"), to: new Date("2024-01-02T09:30:45Z") },
    },
    { input: "T2024:", result: { from: new Date("2024"), to: new Date("9999-12-31") } },
    { input: ":10", result: { from: 0, to: 10 } },
    { input: "2:", result: { from: 2, to: new Date("9999-12-31") } },
    { input: ":", result: { from: 0, to: new Date("9999-12-31") } },
  ].forEach(({ input, result }) => {
    it("should parse ranges correctly", () => {
      expect(parseRange(input)).toEqual({ value: result });
    });
  });

  [
    { range: "T2023-13-01:T2023-01-02", err: "T2023-13-01 is invalid Date." },
    { range: "T2023-01-01:T2023-01-32", err: "T2023-01-32 is invalid Date." },
  ].forEach(({ range, err }) => {
    it("should return an error for invalid date formats", () => {
      expect(parseRange(range)).toEqual({ err });
    });
  });
});

describe("validateRange", () => {
  [
    { from: new Date("2024-01-01T03:00Z"), to: new Date("2024-01-01T00:00Z") },
    { from: new Date("2024-01-02T03:05:00Z"), to: new Date("2024-01-02T03:04:59Z") },
    { from: new Date("2024-01-01T00:00Z"), to: new Date("2023-12-31T00:00Z") },
    { from: 5, to: 2 },
    { from: new Date("2024"), to: 1 },
  ].forEach(input => {
    it("should return an error when right side of order is higher than left", () => {
      const err = { err: "Left side of range can't be bigger than right side!" };

      expect(validateRange(input)).toEqual(err);
    });
  });
});
