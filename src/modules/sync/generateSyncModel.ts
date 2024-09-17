import {
  AssetContracts,
  AssetFolderContracts,
  CollectionContracts,
  ContentItemContracts,
  LanguageContracts,
  ManagementClient,
  SpaceContracts,
  TaxonomyContracts,
  WebSpotlightContracts,
  WorkflowContracts,
} from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as fsPromises from "fs/promises";
import * as path from "path";

import packageJson from "../../../package.json" with { type: "json" };
import { logInfo, LogOptions } from "../../log.js";
import { serializeDateForFileName } from "../../utils/files.js";
import { notNullOrUndefined } from "../../utils/typeguards.js";
import {
  assetFoldersFileName,
  collectionsFileName,
  contentTypesFileName,
  contentTypeSnippetsFileName,
  languagesFileName,
  spacesFileName,
  taxonomiesFileName,
  webSpotlightFileName,
  workflowsFileName,
} from "./constants/filename.js";
import { transformAssetFolderModel } from "./modelTransfomers/assetFolder.js";
import { transformCollectionsModel } from "./modelTransfomers/collections.js";
import { transformContentTypeModel } from "./modelTransfomers/contentTypes.js";
import { transformContentTypeSnippetsModel } from "./modelTransfomers/contentTypeSnippets.js";
import { transformLanguageModel } from "./modelTransfomers/language.js";
import { transformSpacesModel } from "./modelTransfomers/spaceTransformers.js";
import { transformTaxonomyGroupsModel } from "./modelTransfomers/taxonomyGroups.js";
import { transformWebSpotlightModel } from "./modelTransfomers/webSpotlight.js";
import { transformWorkflowModel } from "./modelTransfomers/workflow.js";
import { ContentTypeSnippetsWithUnionElements, ContentTypeWithUnionElements } from "./types/contractModels.js";
import { FileContentModel } from "./types/fileContentModel.js";
import { getRequiredIds } from "./utils/contentTypeHelpers.js";
import {
  fetchAssetFolders,
  fetchCollections,
  fetchContentTypes,
  fetchContentTypeSnippets,
  fetchLanguages,
  fetchRequiredAssets,
  fetchRequiredContentItems,
  fetchSpaces,
  fetchTaxonomies,
  fetchWebSpotlight,
  fetchWorkflows,
} from "./utils/fetchers.js";

export type EnvironmentModel = {
  taxonomyGroups: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsWithUnionElements>;
  contentTypes: ReadonlyArray<ContentTypeWithUnionElements>;
  collections: ReadonlyArray<CollectionContracts.ICollectionContract>;
  webSpotlight: WebSpotlightContracts.IWebSpotlightStatus;
  assetFolders: ReadonlyArray<AssetFolderContracts.IAssetFolderContract>;
  spaces: ReadonlyArray<SpaceContracts.ISpaceContract>;
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>;
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>;
  languages: ReadonlyArray<LanguageContracts.ILanguageModelContract>;
  workflows: ReadonlyArray<WorkflowContracts.IWorkflowContract>;
};

export const fetchModel = async (client: ManagementClient): Promise<EnvironmentModel> => {
  const contentTypes = await fetchContentTypes(client) as unknown as ContentTypeWithUnionElements[];
  const contentTypeSnippets = await fetchContentTypeSnippets(
    client,
  ) as unknown as ContentTypeSnippetsWithUnionElements[];
  const taxonomies = await fetchTaxonomies(client);

  const webSpotlight = await fetchWebSpotlight(client);

  const assetFolders = await fetchAssetFolders(client);

  const spaces = await fetchSpaces(client);

  const collections = await fetchCollections(client);

  const languages = await fetchLanguages(client);

  const workflows = await fetchWorkflows(client);

  const allIds = [...contentTypes, ...contentTypeSnippets].reduce<{ assetIds: Set<string>; itemIds: Set<string> }>(
    (previous, type) => {
      const ids = getRequiredIds(type.elements);

      return {
        assetIds: new Set([...previous.assetIds, ...ids.assetIds]),
        itemIds: new Set([...previous.itemIds, ...ids.itemIds]),
      };
    },
    {
      assetIds: new Set(),
      itemIds: new Set(spaces.map(s => s.web_spotlight_root_item?.id).filter(notNullOrUndefined)),
    },
  );

  const assets = await fetchRequiredAssets(client, Array.from(allIds.assetIds));
  const items = await fetchRequiredContentItems(client, Array.from(allIds.itemIds));

  return {
    contentTypes,
    contentTypeSnippets,
    taxonomyGroups: taxonomies,
    collections,
    webSpotlight,
    spaces,
    assets,
    items,
    assetFolders,
    languages,
    workflows,
  };
};

export const transformSyncModel = (environmentModel: EnvironmentModel, logOptions: LogOptions): FileContentModel => {
  const contentTypeModel = transformContentTypeModel(environmentModel, logOptions);
  const contentTypeSnippetModel = transformContentTypeSnippetsModel(environmentModel, logOptions);
  const taxonomyGroupsModel = transformTaxonomyGroupsModel(environmentModel.taxonomyGroups);
  const collectionsModel = transformCollectionsModel(environmentModel.collections);
  const webSpotlightModel = transformWebSpotlightModel(environmentModel);
  const assetFoldersModel = environmentModel.assetFolders.map(transformAssetFolderModel);
  const spacesModel = transformSpacesModel(environmentModel);
  const languagesModel = transformLanguageModel(environmentModel.languages);
  const workflowsModel = transformWorkflowModel(environmentModel);

  return {
    contentTypes: contentTypeModel,
    contentTypeSnippets: contentTypeSnippetModel,
    taxonomyGroups: taxonomyGroupsModel,
    collections: collectionsModel,
    webSpotlight: webSpotlightModel,
    assetFolders: assetFoldersModel,
    spaces: spacesModel,
    languages: languagesModel,
    workflows: workflowsModel,
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
  await fsPromises.writeFile(
    path.resolve(folderName, webSpotlightFileName),
    JSON.stringify(finalModel.webSpotlight, null, 2),
  );
  await fsPromises.writeFile(
    path.resolve(folderName, assetFoldersFileName),
    JSON.stringify(finalModel.assetFolders, null, 2),
  );
  await fsPromises.writeFile(
    path.resolve(folderName, collectionsFileName),
    JSON.stringify(finalModel.collections, null, 2),
  );
  await fsPromises.writeFile(
    path.resolve(folderName, spacesFileName),
    JSON.stringify(finalModel.spaces, null, 2),
  );
  await fsPromises.writeFile(
    path.resolve(folderName, languagesFileName),
    JSON.stringify(finalModel.languages, null, 2),
  );
  await fsPromises.writeFile(
    path.resolve(folderName, workflowsFileName),
    JSON.stringify(finalModel.workflows, null, 2),
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
