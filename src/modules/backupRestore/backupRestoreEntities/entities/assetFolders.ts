import type { AssetFolderContracts, AssetFolderModels } from "@kontent-ai/management-sdk";

import { zip } from "../../../../utils/array.js";
import type { EntityDefinition } from "../entityDefinition.js";

export const assetFoldersEntity = {
  name: "assetFolders",
  displayName: "assetFolders",
  fetchEntities: (client) =>
    client
      .listAssetFolders()
      .toPromise()
      .then((res) => res.rawData.folders),
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, { entities: fileFolders, context }) => {
    if (!fileFolders.length) {
      return;
    }

    const projectFolders = await client
      .modifyAssetFolders()
      .withData(fileFolders.map(createPatchToAddFolder))
      .toPromise()
      .then((res) => res.rawData.folders);

    return {
      ...context,
      assetFolderIdsByOldIds: new Map(
        zip(fileFolders, projectFolders).flatMap(extractFolderIdEntries),
      ),
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
} as const satisfies EntityDefinition<ReadonlyArray<AssetFolderContracts.IAssetFolderContract>>;

const createPatchToAddFolder = (
  folder: AssetFolderContracts.IAssetFolderContract,
): AssetFolderModels.IModifyAssetFolderData => ({
  op: "addInto",
  value: {
    name: folder.name,
    external_id: folder.external_id ?? folder.id,
    folders: folder.folders.map(createSubFolder),
  },
});

const createPatchToRemoveFolder = (
  folder: AssetFolderContracts.IAssetFolderContract,
): AssetFolderModels.IModifyAssetFolderData => ({
  op: "remove",
  reference: {
    id: folder.id,
  },
});

const createSubFolder = (
  folder: AssetFolderContracts.IAssetFolderContract,
): AssetFolderModels.IAssetFolderValue => ({
  name: folder.name,
  folders: folder.folders.map(createSubFolder),
  external_id: folder.external_id ?? folder.id,
});

const extractFolderIdEntries = ([fileFolder, projectFolder]: readonly [
  AssetFolderContracts.IAssetFolderContract,
  AssetFolderContracts.IAssetFolderContract,
]): ReadonlyArray<readonly [string, string]> => [
  [fileFolder.id, projectFolder.id] as const,
  ...zip(fileFolder.folders, projectFolder.folders).flatMap(extractFolderIdEntries),
];
