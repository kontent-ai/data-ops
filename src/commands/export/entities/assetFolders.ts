import { AssetFolderContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const assetFoldersExportEntity: EntityDefinition<ReadonlyArray<AssetFolderContracts.IAssetFolderContract>> = {
  name: "assetFolders",
  fetchEntities: client => client.listAssetFolders().toPromise().then(res => res.rawData.folders),
  serializeEntities: JSON.stringify,
};
