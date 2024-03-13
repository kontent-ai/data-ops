import {
  AssetContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ManagementClient,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";
import { nodeParse, transformToPortableText } from "@kontent-ai/rich-text-resolver";

import { ManagementClientBaseOptions } from "../../types/managementClient.js";
import { transformContentTypeModel } from "./modelGenerators/contentTypes.js";
import { transformContentTypeSnippetsModel } from "./modelGenerators/contentTypeSnippets.js";
import { transformTaxonomyGroupsModel } from "./modelGenerators/taxonomyGroups.js";
import { FileContentModel } from "./types/fileContentModel.js";
import {
  getAssetElements,
  getGuidelinesElements,
  getLinkedItemsElements,
  getRequiredAssetsIds,
  getRequiredItemIds,
} from "./utils/contentTypeHelpers.js";
import {
  fetchContentTypes,
  fetchContentTypeSnippets,
  fetchRequiredAssets,
  fetchRequiredContentItems,
  fetchTaxonomies,
} from "./utils/fetchers.js";

type EnvironmentModel = {
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

  const guidelinesElements = [...(getGuidelinesElements(contentTypes)), ...getGuidelinesElements(contentTypeSnippets)];
  const assetElements = [...(getAssetElements(contentTypes)), ...getAssetElements(contentTypeSnippets)];
  const linkedItemElements = [
    ...(getLinkedItemsElements(contentTypes)),
    ...getLinkedItemsElements(contentTypeSnippets),
  ];

  const parsedGuidelines = guidelinesElements.map(guideline =>
    transformToPortableText(nodeParse(guideline.guidelines))
  );

  const requiredAssetsIds = getRequiredAssetsIds(assetElements, parsedGuidelines);
  const requiredItemsIds = getRequiredItemIds(linkedItemElements, parsedGuidelines);

  const assets = await fetchRequiredAssets(client, Array.from(requiredAssetsIds));
  const items = await fetchRequiredContentItems(client, Array.from(requiredItemsIds));

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

  const contentTypeModel = transformContentTypeModel(environmentModel.contentTypes);
  const contentTypeSnippetModel = transformContentTypeSnippetsModel(environmentModel.contentTypeSnippets);
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
