import type { EnvironmentModel } from "../generateSyncModel.js";
import type { WebSpotlightSyncModel } from "../types/syncModel.js";

export const transformWebSpotlightModel = (
  environmentModel: EnvironmentModel,
): WebSpotlightSyncModel => {
  const rootTypeCodename = environmentModel.contentTypes.find(
    (type) => type.id === environmentModel.webSpotlight.root_type?.id,
  )?.codename;

  return {
    enabled: environmentModel.webSpotlight.enabled,
    root_type: rootTypeCodename ? { codename: rootTypeCodename } : null,
  };
};
