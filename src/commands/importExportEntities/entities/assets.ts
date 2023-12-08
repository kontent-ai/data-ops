import { AssetContracts, ManagementClient } from "@kontent-ai/management-sdk";
import JSZip from "jszip";

import { serially } from "../../../utils/requests.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";

const assetsBinariesFolderName = "assets";
const createFileName = (asset: AssetContracts.IAssetModelContract) => `${asset.id}-${asset.file_name}`;

type AssetWithElements = AssetContracts.IAssetModelContract & { readonly elements: ReadonlyArray<unknown> };

export const assetsEntity: EntityDefinition<ReadonlyArray<AssetWithElements>> = {
  name: "assets",
  fetchEntities: client => client.listAssets().toAllPromise().then(res => res.data.items.map(a => a._raw as AssetWithElements)),
  serializeEntities: JSON.stringify,
  addOtherFiles: async (assets, zip) => {
    const assetsZip = zip.folder(assetsBinariesFolderName);
    if (!assetsZip) {
      throw new Error("Cannot create a folder in zip.");
    }
    await serially(assets.map(a => () => saveAsset(assetsZip, a)))
  },
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileAssets, context, zip) => {
    const fileAssetsWithElements = fileAssets.filter(a => !!a.elements.length);
    if (fileAssetsWithElements.length) {
      throw new Error(`It is not possible to import assets with elements at the moment. Assets that contain elements are: ${fileAssetsWithElements.map(a => a.id).join(", ")}.`);
    }

    const assetsZip = zip.folder(assetsBinariesFolderName);
    if (!fileAssets.length) {
      return;
    }
    if (!assetsZip) {
      throw new Error(`It is not possible to import assets, because the folder with asset binaries ("${assetsBinariesFolderName}") is missing.`);
    }

    const assetIdEntries = await serially(fileAssets.map(createImportAssetFetcher(assetsZip, client, context)));

    return {
      ...context,
      assetIdsByOldIds: new Map(assetIdEntries),
    };
  },
};

const saveAsset = async (zip: JSZip, asset: AssetContracts.IAssetModelContract) => {
  const file = await fetch(asset.url).then(res => res.blob()).then(res => res.arrayBuffer());
  zip.file(createFileName(asset), file);
};

const createImportAssetFetcher = (zip: JSZip, client: ManagementClient, context: ImportContext) =>
  (fileAsset: AssetContracts.IAssetModelContract) => async (): Promise<readonly [string, string]> => {
    const binary = await zip.file(createFileName(fileAsset))?.async("nodebuffer");

    if (!binary) {
      throw new Error(`Failed to load a binary file "${fileAsset.file_name}" for asset "${fileAsset.id}".`);
    }
    const folderId = fileAsset.folder?.id ? context.assetFolderIdsByOldIds.get(fileAsset.folder.id) : undefined;
    const collectionId = fileAsset.collection?.reference?.id ? context.collectionIdsByOldIds.get(fileAsset.collection.reference.id) : undefined;

    const fileRef = await client
      .uploadBinaryFile()
      .withData({
        filename: fileAsset.file_name,
        contentType: fileAsset.type,
        binaryData: binary,
      })
      .toPromise()
      .then(res => res.data);

    const projectAsset = await client
      .addAsset()
      .withData(() => ({
        title: fileAsset.title,
        codename: fileAsset.codename,
        ...folderId ? { folder: { id: folderId } } : undefined,
        file_reference: fileRef,
        ...collectionId ? { collection: { reference: { id: collectionId } } } : undefined,
        external_id: fileAsset.external_id || fileAsset.codename,
        descriptions: fileAsset.descriptions.map(d => {
          const newLanguageId = context.languageIdsByOldIds.get(d.language.id ?? "");
          if (!newLanguageId) {
            throw new Error(`There is no language id for old language id "${d.language.id}". This should never happen.`);
          }
          return ({ description: d.description, language: { id: newLanguageId } });
        })
      }))
      .toPromise()
      .then(res => res.data);

    return [fileAsset.id, projectAsset.id] as const;
  };
