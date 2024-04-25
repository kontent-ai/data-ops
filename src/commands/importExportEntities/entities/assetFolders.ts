import { AssetFolderContracts, AssetFolderModels } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { EntityDefinition } from "../entityDefinition.js";

export const assetFoldersEntity: EntityDefinition<ReadonlyArray<AssetFolderContracts.IAssetFolderContract>> = {
  name: "assetFolders",
  displayName: "assetFolders",
  fetchEntities: client => client.listAssetFolders().toPromise().then(res => res.rawData.folders),
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileFolders, context) => {
    if (!fileFolders.length) {
      return;
    }

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
  cleanEntities: async (client, assetFolders) => {
    if (!assetFolders.length) {
      return;
    }

    await client
      .modifyAssetFolders()
      .withData(assetFolders.map(createPatchToRemoveFolder))
      .toPromise();
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

const createPatchToRemoveFolder = (
  folder: AssetFolderContracts.IAssetFolderContract,
): AssetFolderModels.IModifyAssetFoldersData => ({
  op: "remove",
  reference: {
    id: folder.id,
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
