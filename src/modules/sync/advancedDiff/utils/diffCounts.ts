import { isOp } from "../../sync/utils.js";
import type { DiffObject } from "../../types/diffModel.js";
import type { PatchOperation } from "../../types/patchOperation.js";

export type DiffCounts = Readonly<{
  added: number;
  modified: number;
  removed: number;
}>;

export const countDiffObject = (diff: DiffObject<{ codename: string }>): DiffCounts => ({
  added: diff.added.length,
  modified: [...diff.updated.values()].filter((ops) => ops.length > 0).length,
  removed: diff.deleted.size,
});

export const countPatchOps = (ops: ReadonlyArray<PatchOperation>): DiffCounts => ({
  added: ops.filter(isOp("addInto")).length,
  modified: ops.filter(isOp("replace")).length,
  removed: ops.filter(isOp("remove")).length,
});
