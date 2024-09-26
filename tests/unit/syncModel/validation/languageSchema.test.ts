import { describe, expect, it } from "vitest";

import { LanguageSchema } from "../../../../src/modules/sync/validation/entitySchema.js";

describe("LanguageSchema Tests", () => {
  it("Valid object with is_default true", () => {
    const validData = {
      name: "English",
      codename: "en",
      is_active: true,
      is_default: true,
    };

    const result = LanguageSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("Valid object with is_default false and valid fallback_language", () => {
    const validData = {
      name: "French",
      codename: "fr",
      is_active: true,
      is_default: false,
      fallback_language: {
        codename: "en",
      },
    };

    const result = LanguageSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("Invalid object with is_default true and fallback_language provided", () => {
    const invalidData = {
      name: "English",
      codename: "en",
      is_active: true,
      is_default: true,
      fallback_language: {
        codename: "en",
      },
    };

    const result = LanguageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
