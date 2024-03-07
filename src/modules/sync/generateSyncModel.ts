import { ManagementClient } from "@kontent-ai/management-sdk";

import { ManagementClientBaseOptions } from "../../types/managementClient.js";
import { generateContentTypeModel } from "./modelGenerators/contentTypes.js";
import { generateContentTypeSnippetsModel } from "./modelGenerators/contentTypeSnippets.js";
import { generateTaxonomyGroupsModel } from "./modelGenerators/taxonomyGroups.js";

type GetModelConfig = ManagementClientBaseOptions & GetModelOptions;

type GetModelOptions = Readonly<{
  filename?: string;
}>;

export const generateSyncModelToFile = (config: GetModelConfig) => {
  /**
   * This function should create the file dateTime-environmentId.json (if other name not specified)
   * This file contains the content model from the given environmentId (you can use the type fileContentModel).
   * The internalIds should be replaced by codenames.
   * Unnecesary fields for syncing like lastModified should be removed.
   * The tool might add comment about the datetime and tool's version.
   */

  // TODO
  const client = new ManagementClient({
    environmentId: config.environmentId,
    apiKey: config.apiKey,
  });

  const contentTypeModel = generateContentTypeModel(client);
  const contentTypeSnippetModel = generateContentTypeSnippetsModel(client);
  const taxonomyGroupsModel = generateTaxonomyGroupsModel(client);

  contentTypeModel as never;
  contentTypeSnippetModel as never;
  taxonomyGroupsModel as never;
};
