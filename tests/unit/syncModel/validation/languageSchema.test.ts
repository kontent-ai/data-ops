import { describe, expect, test } from "vitest";

import { LanguageSchema } from "../../../../src/modules/sync/validation/entitySchema.js";

describe("LanguageSchema Tests", () => {
  test("Valid object with is_default true", () => {
    const validData = {
      name: "English",
      codename: "en",
      is_active: true,
      is_default: true,
    };

    const result = LanguageSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test("Valid object with is_default false and valid fallback_language", () => {
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

  test("Invalid object with is_default true and fallback_language provided", () => {
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

  test("Invalid object with is_default false and missing fallback_language", () => {
    const invalidData = {
      name: "French",
      codename: "fr",
      is_active: true,
      is_default: false,
      // Missing fallback_language
    };

    const result = LanguageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test("Invalid object missing required fields", () => {
    const invalidData = {
      codename: "en",
      is_active: true,
      is_default: true,
      // Missing 'name'
    };

    const result = LanguageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test("Invalid object with wrong field types", () => {
    const invalidData = {
      name: 123, // Should be a string
      codename: "en",
      is_active: "true", // Should be a boolean
      is_default: true,
    };

    const result = LanguageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test("Invalid object with invalid fallback_language", () => {
    const invalidData = {
      name: "French",
      codename: "fr",
      is_active: true,
      is_default: false,
      fallback_language: {
        // 'codename' is missing
        code: "en",
      },
    };

    const result = LanguageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test("Invalid object with extra properties in fallback_language", () => {
    const validData = {
      name: "French",
      codename: "fr",
      is_active: true,
      is_default: false,
      fallback_language: {
        codename: "en",
        extraProp: "ignored",
      },
    };

    const result = LanguageSchema.safeParse(validData);
    expect(result.success).toBe(false);
  });

  test("Invalid object with null properties", () => {
    const invalidData = {
      name: null,
      codename: null,
      is_active: null,
      is_default: true,
    };

    const result = LanguageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test("Invalid object that is empty", () => {
    const invalidData = {};

    const result = LanguageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
