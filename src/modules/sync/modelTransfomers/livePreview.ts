import type { EnvironmentModel } from "../generateSyncModel.js";
import type { LivePreviewSyncModel } from "../types/syncModel.js";

export const transformLivePreviewModel = (
  environmentModel: EnvironmentModel,
): LivePreviewSyncModel => ({
  status: environmentModel.livePreview.status,
});
