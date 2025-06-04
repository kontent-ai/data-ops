import { describe, expect, it } from "vitest";

import { TypeSchema } from "../../../../src/modules/sync/validation/entitySchema.js";

const validElementWithoutGroup = {
  name: "Text Element",
  codename: "text_element",
  type: "text",
};

const validElementWithGroup = {
  ...validElementWithoutGroup,
  content_group: { codename: "group1" },
};

describe("TypeSchema", () => {
  it('should validate successfully when content_groups is empty and elements have no content_group (groups_number "zero")', () => {
    const input = {
      name: "Type Without Groups",
      codename: "type_without_groups",
      content_groups: [],
      elements: [validElementWithoutGroup],
    };

    const result = TypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        name: "Type Without Groups",
        codename: "type_without_groups",
        content_groups: [],
        elements: [validElementWithoutGroup],
      });
    }
  });

  it('should validate successfully when content_groups is non-empty and elements have content_group (groups_number "multiple")', () => {
    const input = {
      name: "Type With Groups",
      codename: "type_with_groups",
      content_groups: [{ codename: "group1", name: "Group 1" }],
      elements: [validElementWithGroup],
    };

    const result = TypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        name: "Type With Groups",
        codename: "type_with_groups",
        content_groups: [{ codename: "group1", name: "Group 1" }],
        elements: [validElementWithGroup],
      });
    }
  });

  it("should fail validation when additional property is involved", () => {
    const input = {
      name: "Invalid Type",
      codename: "invalid_type",
      content_groups: [],
      non_existing_property: "",
      elements: [validElementWithoutGroup],
    };

    const result = TypeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail validation when content_groups is empty but elements have content_group", () => {
    const input = {
      name: "Invalid Type",
      codename: "invalid_type",
      content_groups: [],
      elements: [validElementWithGroup],
    };

    const result = TypeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail validation when content_groups is non-empty but elements lack content_group", () => {
    const input = {
      name: "Invalid Type",
      codename: "invalid_type",
      content_groups: [{ codename: "group1", name: "Group 1" }],
      elements: [validElementWithoutGroup],
    };

    const result = TypeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail validation when elements have content_group not defined in content_groups", () => {
    const input = {
      name: "Invalid Type",
      codename: "invalid_type",
      content_groups: [{ codename: "group1", name: "Group 1" }],
      elements: [
        {
          ...validElementWithGroup,
          content_group: { codename: "non_existent_group" },
        },
      ],
    };

    const result = TypeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
