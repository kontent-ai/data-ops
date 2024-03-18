import {
  AssetContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ManagementClient,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { ManagementClientBaseOptions } from "../../types/managementClient.js";
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
    { assetIds: new Set<string>(), itemIds: new Set<string>() },
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

export const saveSyncModel = (syncModel: FileContentModel) => {
  // TODO
  /**
   * This function should create the file dateTime-environmentId.json (if other name not specified)
   * This file contains the content model from the given environmentId (you can use the type fileContentModel).
   * The tool might add comment about the datetime and tool's version.
   */
  syncModel as never;
};
