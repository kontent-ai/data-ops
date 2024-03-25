import {
  AssetContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ManagementClient,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as fsPromises from "fs/promises";

import packageJson from "../../../package.json" with { type: "json" };
import { logInfo, LogOptions } from "../../log.js";
import { ManagementClientBaseOptions } from "../../types/managementClient.js";
import { serializeDateForFileName } from "../../utils/files.js";
import { transformContentTypeModel } from "./modelTransfomers/contentTypes.js";
import { transformContentTypeSnippetsModel } from "./modelTransfomers/contentTypeSnippets.js";
import { transformTaxonomyGroupsModel } from "./modelTransfomers/taxonomyGroups.js";
import { FileContentModel } from "./types/fileContentModel.js";
import { getRequiredIds } from "./utils/contentTypeHelpers.js";
import {
  fetchContentTypes,
  fetchContentTypeSnippets,
  fetchRequiredAssets,
  fetchRequiredContentItems,
  fetchTaxonomies,
} from "./utils/fetchers.js";

export type EnvironmentModel = {
  taxonomyGroups: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>;
  contentTypes: ReadonlyArray<ContentTypeContracts.IContentTypeContract>;
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>;
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>;
};

export const fetchModel = async (config: ManagementClientBaseOptions): Promise<EnvironmentModel> => {
  const client = new ManagementClient({
    environmentId: config.environmentId,
    apiKey: config.apiKey,
  });

  const contentTypes = await fetchContentTypes(client);
  const contentTypeSnippets = await fetchContentTypeSnippets(client);
  const taxonomies = await fetchTaxonomies(client);

  const allIds = [...contentTypes, ...contentTypeSnippets].reduce<{ assetIds: Set<string>; itemIds: Set<string> }>(
    (previous, type) => {
      const ids = getRequiredIds(type);

      return {
        assetIds: new Set([...previous.assetIds, ...ids.assetIds]),
        itemIds: new Set([...previous.itemIds, ...ids.itemIds]),
      };
    },
    { assetIds: new Set(), itemIds: new Set() },
  );

  const assets = await fetchRequiredAssets(client, Array.from(allIds.assetIds));
  const items = await fetchRequiredContentItems(client, Array.from(allIds.itemIds));

  return {
    contentTypes,
    contentTypeSnippets,
    taxonomyGroups: taxonomies,
    assets,
    items,
  };
};

export const transformSyncModel = (environmentModel: EnvironmentModel): FileContentModel => {
  /**
   * The internalIds should be replaced by codenames.
   * Unnecesary fields for syncing like lastModified should be removed.
   */

  // TODO

  const contentTypeModel = transformContentTypeModel(environmentModel);
  const contentTypeSnippetModel = transformContentTypeSnippetsModel(environmentModel);
  const taxonomyGroupsModel = transformTaxonomyGroupsModel(environmentModel.taxonomyGroups);

  return {
    contentTypes: contentTypeModel,
    contentTypeSnippets: contentTypeSnippetModel,
    taxonomyGroups: taxonomyGroupsModel,
  };
};

type SaveModelParams =
  & Readonly<{
    syncModel: FileContentModel;
    environmentId: string;
    fileName: string | undefined;
  }>
  & LogOptions;

export const saveSyncModel = async (params: SaveModelParams) => {
  const now = new Date();
  const finalModel: FileContentWithMetadata = {
    ...params.syncModel,
    metadata: {
      generatedAt: now,
      generatedWithVersion: packageJson.version,
      generatedFromEnvironmentId: params.environmentId,
    },
  };
  const fileName = params.fileName ?? `${serializeDateForFileName(now)}-${params.environmentId}.json`;

  logInfo(params, "standard", `Saving the model into "${chalk.yellow(fileName)}".`);
  await fsPromises.writeFile(fileName, JSON.stringify(finalModel));

  return fileName;
};

type FileContentWithMetadata =
  & FileContentModel
  & Readonly<{
    metadata: Readonly<{
      generatedAt: Date;
      generatedWithVersion: string;
      generatedFromEnvironmentId: string;
    }>;
  }>;
