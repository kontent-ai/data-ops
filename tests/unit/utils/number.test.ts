import { describe, expect, it } from "vitest";

import { padWithLeadingZeros } from "../../../src/utils/number.js";

describe("padWithLeadingZeros", () => {
  it.each([
    { input: [5, 3], expected: "005" },
    { input: [42, 5], expected: "00042" },
    { input: [0, 4], expected: "0000" },
    { input: [123, 2], expected: "123" },
    { input: [4567, 4], expected: "4567" },
    { input: [5, 0], expected: "5" },
    { input: [8, undefined], expected: "8" },
    { input: [123, undefined], expected: "123" },
  ] as const)("should return $expected for input $input", ({ input, expected }) => {
    const [num, leadingZeros] = input;
    expect(padWithLeadingZeros(num, leadingZeros)).toBe(expected);
  });
});
