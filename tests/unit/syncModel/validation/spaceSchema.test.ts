import { describe, expect, it } from "vitest";

import { SpaceSchema } from "../../../../src/modules/sync/validation/entitySchema.js";

describe("SpaceSchema root-item deprecation window", () => {
  it("maps legacy web_spotlight_root_item to root_item and mirrors it back as the deprecated alias", () => {
    const input = {
      name: "Default",
      codename: "default",
      web_spotlight_root_item: { codename: "homepage" },
      collections: [],
    };

    const result = SpaceSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.root_item).toEqual({ codename: "homepage" });
      expect(result.data.web_spotlight_root_item).toEqual({ codename: "homepage" });
    }
  });

  it("mirrors root_item into the deprecated alias when only root_item is provided", () => {
    const input = {
      name: "Default",
      codename: "default",
      root_item: { codename: "homepage" },
      collections: [],
    };

    const result = SpaceSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.root_item).toEqual({ codename: "homepage" });
      expect(result.data.web_spotlight_root_item).toEqual({ codename: "homepage" });
    }
  });

  it("prefers root_item over web_spotlight_root_item when both are present and mirrors the winner", () => {
    const input = {
      name: "Default",
      codename: "default",
      root_item: { codename: "new_root" },
      web_spotlight_root_item: { codename: "legacy_root" },
      collections: [],
    };

    const result = SpaceSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.root_item).toEqual({ codename: "new_root" });
      expect(result.data.web_spotlight_root_item).toEqual({ codename: "new_root" });
    }
  });

  it("leaves both root_item and the deprecated alias undefined when neither key is provided", () => {
    const input = {
      name: "Default",
      codename: "default",
      collections: [],
    };

    const result = SpaceSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.root_item).toBeUndefined();
      expect(result.data.web_spotlight_root_item).toBeUndefined();
    }
  });
});
