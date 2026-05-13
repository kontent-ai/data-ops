import type { LivePreviewDiffModel } from "../types/diffModel.js";
import type { LivePreviewSyncModel } from "../types/syncModel.js";

export const livePreviewHandler = (
  source: LivePreviewSyncModel,
  target: LivePreviewSyncModel,
): LivePreviewDiffModel =>
  source.status === target.status
    ? { change: "none" }
    : { change: "update", status: source.status };
