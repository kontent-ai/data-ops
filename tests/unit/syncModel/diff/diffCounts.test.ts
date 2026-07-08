import { describe, expect, it } from "vitest";

import { countPatchOps } from "../../../../src/modules/sync/advancedDiff/utils/diffCounts.ts";
import type { PatchOperation } from "../../../../src/modules/sync/types/patchOperation.ts";

const addInto: PatchOperation = { op: "addInto", path: "", value: { codename: "collection_1" } };
const replace: PatchOperation = {
  op: "replace",
  path: "/codename:collection_1/name",
  value: "New name",
  oldValue: "Old name",
};
const remove: PatchOperation = { op: "remove", path: "/codename:collection_1", oldValue: {} };
const move: PatchOperation = {
  op: "move",
  path: "/codename:collection_1",
  after: { codename: "collection_2" },
};

describe("countPatchOps", () => {
  it("counts each operation type", () => {
    const ops = [addInto, addInto, replace, remove, move];

    expect(countPatchOps(ops)).toStrictEqual({ added: 2, modified: 2, removed: 1 });
  });

  it("counts a pure reorder as modifications", () => {
    const ops = [move, move, move];

    expect(countPatchOps(ops)).toStrictEqual({ added: 0, modified: 3, removed: 0 });
  });
});
