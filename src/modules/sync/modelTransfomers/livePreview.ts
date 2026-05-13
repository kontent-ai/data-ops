import type { EnvironmentModel } from "../generateSyncModel.js";
import type { LivePreviewSyncModel } from "../types/syncModel.js";

export const transformLivePreviewModel = (
  environmentModel: EnvironmentModel,
): LivePreviewSyncModel => ({
  // MAPI only ever returns "enabled" or "disabled", but the SDK types the field as `string`.
  status: environmentModel.livePreview.status as "enabled" | "disabled",
});
