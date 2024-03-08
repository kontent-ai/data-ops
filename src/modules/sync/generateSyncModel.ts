import {
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ManagementClient,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { ManagementClientBaseOptions } from "../../types/managementClient.js";
import { transformContentTypeModel } from "./modelGenerators/contentTypes.js";
import { transformContentTypeSnippetsModel } from "./modelGenerators/contentTypeSnippets.js";
import { transformTaxonomyGroupsModel } from "./modelGenerators/taxonomyGroups.js";
import { FileContentModel } from "./types/fileContentModel.js";

type EnvironmentModel = {
  taxonomyGroups: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>;
  contentTypes: ReadonlyArray<ContentTypeContracts.IContentTypeContract>;
};

export const fetchModel = async (config: ManagementClientBaseOptions): Promise<EnvironmentModel> => {
  const client = new ManagementClient({
    environmentId: config.environmentId,
    apiKey: config.apiKey,
  });

  const contentTypes = await client
    .listContentTypes()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw));

  const contentTypeSnippets = await client
    .listContentTypeSnippets()
    .toAllPromise()
    .then(res => res.data.items.map(s => s._raw));

  const taxonomies = await client
    .listTaxonomies()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw));

  return {
    contentTypes,
    contentTypeSnippets,
    taxonomyGroups: taxonomies,
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

  contentTypeModel as never;
  contentTypeSnippetModel as never;
  taxonomyGroupsModel as never;

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
