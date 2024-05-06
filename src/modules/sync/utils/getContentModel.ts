import { ManagementClient } from "@kontent-ai/management-sdk";
import * as fs from "fs/promises";

import { LogOptions } from "../../../log.js";
import { contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName } from "../constants/filename.js";
import { fetchModel, transformSyncModel } from "../generateSyncModel.js";
import {
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  FileContentModel,
  TaxonomySyncModel,
} from "../types/fileContentModel.js";
import { getRequiredCodenames } from "./contentTypeHelpers.js";
import { fetchRequiredAssetsByCodename, fetchRequiredContentItemsByCodename } from "./fetchers.js";

export const readContentModelFromFolder = async (folderName: string): Promise<FileContentModel> => {
  // in future we should use typeguard to check whether the content is valid
  const contentTypes = JSON.parse(
    await fs.readFile(`${folderName}/${contentTypesFileName}`, "utf8"),
  ) as unknown as ReadonlyArray<
    ContentTypeSyncModel
  >;
  const snippets = JSON.parse(
    await fs.readFile(`${folderName}/${contentTypeSnippetsFileName}`, "utf8"),
  ) as unknown as ReadonlyArray<
    ContentTypeSnippetsSyncModel
  >;
  const taxonomyGroups = JSON.parse(
    await fs.readFile(`${folderName}/${taxonomiesFileName}`, "utf8"),
  ) as unknown as ReadonlyArray<
    TaxonomySyncModel
  >;

  return {
    contentTypes,
    contentTypeSnippets: snippets,
    taxonomyGroups: taxonomyGroups,
  };
};

type AssetItemsCodenames = {
  assetCodenames: Set<string>;
  itemCodenames: Set<string>;
};

export const getSourceItemAndAssetCodenames = (sourceModel: FileContentModel): AssetItemsCodenames =>
  [...sourceModel.contentTypes, ...sourceModel.contentTypeSnippets].reduce<
    { assetCodenames: Set<string>; itemCodenames: Set<string> }
  >(
    (previous, type) => {
      const ids = getRequiredCodenames(type.elements);

      return {
        assetCodenames: new Set([...previous.assetCodenames, ...ids.assetCodenames]),
        itemCodenames: new Set([...previous.itemCodenames, ...ids.itemCodenames]),
      };
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
