import { AssetFolderContracts, AssetFolderModels } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { EntityDefinition } from "../entityDefinition.js";

export const assetFoldersEntity: EntityDefinition<ReadonlyArray<AssetFolderContracts.IAssetFolderContract>> = {
  name: "assetFolders",
  fetchEntities: client => client.listAssetFolders().toPromise().then(res => res.rawData.folders),
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileFolders, context) => {
    const projectFolders = await client
      .modifyAssetFolders()
      .withData(fileFolders.map(createPatchToAddFolder))
      .toPromise()
      .then(res => res.rawData.folders);

    return {
      ...context,
      assetFolderIdsByOldIds: new Map(zip(fileFolders, projectFolders).flatMap(extractFolderIdEntries)),
    };
  },
};

const createPatchToAddFolder = (
  folder: AssetFolderContracts.IAssetFolderContract,
): AssetFolderModels.IModifyAssetFoldersData => ({
  op: "addInto",
  value: {
    name: folder.name,
    external_id: folder.external_id ?? folder.id,
    folders: folder.folders.map(createSubFolder),
  },
});

const createSubFolder = (
  folder: AssetFolderContracts.IAssetFolderContract,
): AssetFolderModels.IAddOrModifyAssetFolderData => ({
  name: folder.name,
  folders: folder.folders.map(createSubFolder),
  external_id: folder.external_id ?? folder.id,
});

const extractFolderIdEntries = (
  [fileFolder, projectFolder]: readonly [
    AssetFolderContracts.IAssetFolderContract,
    AssetFolderContracts.IAssetFolderContract,
  ],
): ReadonlyArray<readonly [string, string]> => [
  [fileFolder.id, projectFolder.id] as const,
  ...zip(fileFolder.folders, projectFolder.folders).flatMap(extractFolderIdEntries),
];
