import { describe, expect, it } from "vitest";

import { spaceHandler } from "../../../../src/modules/sync/diff/space.ts";
import { SpaceSyncModel } from "../../../../src/modules/sync/types/syncModel.ts";

describe("spaceHandler", () => {
  it("creates a replace operation for every changed property", () => {
    const source: SpaceSyncModel = {
      name: "name source",
      codename: "space",
      web_spotlight_root_item: { codename: "item1" },
      collections: [{ codename: "collection1" }],
    };
    const target: SpaceSyncModel = {
      name: "name target",
      codename: "space",
      web_spotlight_root_item: { codename: "item2" },
      collections: [{ codename: "collection2" }],
    };

    const result = spaceHandler(source, target);

    expect(result).toStrictEqual([
      { op: "replace", path: "/name", value: "name source", oldValue: "name target" },
      {
        op: "replace",
        path: "/web_spotlight_root_item",
        value: { codename: "item1" },
        oldValue: { codename: "item2" },
      },
      {
        op: "replace",
        path: "/collections",
        value: [{ codename: "collection1" }],
        oldValue: [{ codename: "collection2" }],
      },
    ]);
  });

  it("does not create any operations for the same spaces", () => {
    const source: SpaceSyncModel = {
      name: "name",
      codename: "space",
      web_spotlight_root_item: { codename: "item" },
      collections: [{ codename: "collection" }],
    };
    const target: SpaceSyncModel = {
      name: "name",
      codename: "space",
      web_spotlight_root_item: { codename: "item" },
      collections: [{ codename: "collection" }],
    };

    const result = spaceHandler(source, target);

    expect(result).toStrictEqual([]);
  });
});
