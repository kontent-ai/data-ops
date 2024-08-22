import { ManagementClient } from "@kontent-ai/management-sdk";
import * as fs from "fs/promises";

import { LogOptions } from "../../../log.js";
import {
  assetFoldersFileName,
  contentTypesFileName,
  contentTypeSnippetsFileName,
  taxonomiesFileName,
  webSpotlightFileName,
} from "../constants/filename.js";
import { fetchModel, transformSyncModel } from "../generateSyncModel.js";
import { FileContentModel } from "../types/fileContentModel.js";
import {
  AssetFolderSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  TaxonomySyncModel,
  WebSpotlightSyncModel,
} from "../types/syncModel.js";
import { getRequiredCodenames } from "./contentTypeHelpers.js";
import { fetchRequiredAssetsByCodename, fetchRequiredContentItemsByCodename } from "./fetchers.js";

export const readContentModelFromFolder = async (folderName: string): Promise<FileContentModel> => {
  // in future we should use typeguard to check whether the content is valid
  const contentTypes = JSON.parse(
    await fs.readFile(`${folderName}/${contentTypesFileName}`, "utf8"),
  ) as ReadonlyArray<ContentTypeSyncModel>;

  const snippets = JSON.parse(
    await fs.readFile(`${folderName}/${contentTypeSnippetsFileName}`, "utf8"),
  ) as ReadonlyArray<ContentTypeSnippetsSyncModel>;
  const taxonomyGroups = JSON.parse(
    await fs.readFile(`${folderName}/${taxonomiesFileName}`, "utf8"),
  ) as ReadonlyArray<TaxonomySyncModel>;

  const webSpotlight = JSON.parse(
    await fs.readFile(`${folderName}/${webSpotlightFileName}`, "utf8"),
  ) as WebSpotlightSyncModel;

  const assetFolders = JSON.parse(
    await fs.readFile(`${folderName}/${assetFoldersFileName}`, "utf8").catch(() => "[]"),
  ) as ReadonlyArray<AssetFolderSyncModel>;

  return {
    contentTypes,
    contentTypeSnippets: snippets,
    taxonomyGroups: taxonomyGroups,
    webSpotlight,
    assetFolders,
  };
};

type AssetItemsCodenames = Readonly<{
  assetCodenames: ReadonlySet<string>;
  itemCodenames: ReadonlySet<string>;
}>;

export const getSourceItemAndAssetCodenames = (sourceModel: FileContentModel): AssetItemsCodenames =>
  [...sourceModel.contentTypes, ...sourceModel.contentTypeSnippets].reduce<
    { assetCodenames: Set<string>; itemCodenames: Set<string> }
  >(
    (previous, type) => {
      const requiredIds = getRequiredCodenames(type.elements);

      requiredIds.assetCodenames.forEach(c => previous.assetCodenames.add(c));
      requiredIds.itemCodenames.forEach(c => previous.itemCodenames.add(c));

      return previous;
    },
    { assetCodenames: new Set(), itemCodenames: new Set() },
  );

export const getTargetContentModel = async (
  targetClient: ManagementClient,
  itemAndAssetCodenames: AssetItemsCodenames,
  logOptions: LogOptions,
) => {
  const targetModel = await fetchModel(targetClient);
  const targetAssetsBySourceCodenames = await fetchRequiredAssetsByCodename(
    targetClient,
    Array.from(itemAndAssetCodenames.assetCodenames),
  );
  const targetItemsBySourceCodenames = await fetchRequiredContentItemsByCodename(
    targetClient,
    Array.from(itemAndAssetCodenames.itemCodenames),
  );

  const assetsReferences = new Map(
    targetAssetsBySourceCodenames.map(i => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const itemReferences = new Map(
    targetItemsBySourceCodenames.map(i => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const transformedTargetModel = transformSyncModel(targetModel, logOptions);

  return {
    assetsReferences,
    itemReferences,
    transformedTargetModel,
  };
};
