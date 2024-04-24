import { AssetContracts, ContentItemContracts, ManagementClient, TaxonomyContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as fsPromises from "fs/promises";
import * as path from "path";

import packageJson from "../../../package.json" with { type: "json" };
import { logInfo, LogOptions } from "../../log.js";
import { ManagementClientBaseOptions } from "../../types/managementClient.js";
import { serializeDateForFileName } from "../../utils/files.js";
import { contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName } from "./constants/filename.js";
import { transformContentTypeModel } from "./modelTransfomers/contentTypes.js";
import { transformContentTypeSnippetsModel } from "./modelTransfomers/contentTypeSnippets.js";
import { transformTaxonomyGroupsModel } from "./modelTransfomers/taxonomyGroups.js";
import { ContentTypeSnippetsWithUnionElements, ContentTypeWithUnionElements } from "./types/contractModels.js";
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
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsWithUnionElements>;
  contentTypes: ReadonlyArray<ContentTypeWithUnionElements>;
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>;
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>;
};

export const fetchModel = async (config: ManagementClientBaseOptions): Promise<EnvironmentModel> => {
  const client = new ManagementClient({
    environmentId: config.environmentId,
    apiKey: config.apiKey,
  });

  const contentTypes = await fetchContentTypes(client) as unknown as ContentTypeWithUnionElements[];
  const contentTypeSnippets = await fetchContentTypeSnippets(
    client,
  ) as unknown as ContentTypeSnippetsWithUnionElements[];
  const taxonomies = await fetchTaxonomies(client);

  const allIds = [...contentTypes, ...contentTypeSnippets].reduce<{ assetIds: Set<string>; itemIds: Set<string> }>(
    (previous, type) => {
      const ids = getRequiredIds(type.elements);

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

export const transformSyncModel = (environmentModel: EnvironmentModel, logOptions: LogOptions): FileContentModel => {
  const contentTypeModel = transformContentTypeModel(environmentModel, logOptions);
  const contentTypeSnippetModel = transformContentTypeSnippetsModel(environmentModel, logOptions);
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
    folderName: string | undefined;
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
  const folderName = params.folderName ?? `${serializeDateForFileName(now)}-${params.environmentId}`;

  logInfo(params, "standard", `Saving the model into a folder "${chalk.yellow(folderName)}".`);

  await fsPromises.mkdir(folderName, { recursive: true });

  await fsPromises.writeFile(
    path.resolve(folderName, contentTypesFileName),
    JSON.stringify(finalModel.contentTypes, null, 2),
  );
  await fsPromises.writeFile(
    path.resolve(folderName, contentTypeSnippetsFileName),
    JSON.stringify(finalModel.contentTypeSnippets, null, 2),
  );
  await fsPromises.writeFile(
    path.resolve(folderName, taxonomiesFileName),
    JSON.stringify(finalModel.taxonomyGroups, null, 2),
  );
  await fsPromises.writeFile(path.resolve(folderName, "metadata.json"), JSON.stringify(finalModel.metadata, null, 2));

  return folderName;
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
