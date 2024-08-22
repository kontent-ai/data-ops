import { AssetFolderContracts } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";
import { AssetFolderSyncModel } from "../types/syncModel.js";

export const transformAssetFolderModel = (
  environmentModel: AssetFolderContracts.IAssetFolderContract,
): AssetFolderSyncModel => ({
  ...omit(environmentModel, ["id", "external_id"]),
  folders: environmentModel.folders.map(transformAssetFolderModel),
});
