import { ManagementClient } from "@kontent-ai/management-sdk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { Expect } from "../../utils/types.js";
import { syncEntityDependencies, SyncEntityName } from "./constants/entities.js";
import { diff } from "./diff.js";
import { filterModel } from "./generateSyncModel.js";
import { sync } from "./sync.js";
import { DiffModel } from "./types/diffModel.js";
import { FileContentModel } from "./types/fileContentModel.js";
import {
  AssetFolderSyncModel,
  CollectionSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  LanguageSyncModel,
  SpaceSyncModel,
  TaxonomySyncModel,
  WorkflowSyncModel,
} from "./types/syncModel.js";
import {
  fetchSourceSyncModel,
  getSourceItemAndAssetCodenames,
  getSourceSyncModelFromFolder,
  getTargetContentModel,
} from "./utils/getContentModel.js";
import { validateDiffedModel, validateSyncModelFolder } from "./validation.js";

type ExpectedSyncEntities = Record<SyncEntityName, ((entity: any) => boolean) | boolean>;

export type SyncEntities = Partial<
  Expect<ExpectedSyncEntities, {
    contentTypes: (type: ContentTypeSyncModel) => boolean;
    contentTypeSnippets: (snippet: ContentTypeSnippetsSyncModel) => boolean;
    taxonomies: (taxonomy: TaxonomySyncModel) => boolean;
    assetFolders: (assetFolder: AssetFolderSyncModel) => boolean;
    collections: (collection: CollectionSyncModel) => boolean;
    spaces: (space: SpaceSyncModel) => boolean;
    languages: (language: LanguageSyncModel) => boolean;
    workflows: (workflow: WorkflowSyncModel) => boolean;
    webSpotlight: boolean;
  }>
>;

export type SyncRunParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
    entities: SyncEntities;
    kontentUrl?: string;
  }
  & (
    | { folderName: string }
    | { sourceEnvironmentId: string; sourceApiKey: string }
  )
  & LogOptions
>;
/**
 * Synchronizes content model between two environments. This function can either synchronize
 * from a source environment to a target environment or use a pre-defined folder containing the content model
 * for synchronization.
 *
 * Warning!: Synchronizing workflows will make them accessible to all roles in your environment.
 *
 * @param {SyncRunParams} params - The parameters for running the synchronization.
 * @param {string} params.targetEnvironmentId - The ID of the target environment where the content model will be synchronized.
 * @param {string} params.targetApiKey - The API key for accessing the target environment.
 * @param {SyncEntities} params.entities - The entities that need to be synchronized. It includes content types, snippets, taxonomies, etc. If entity is not specified, no items from the given entity will be synced. To sync all item form an entity use () => true.
 * @param {string} [params.folderName] - Optional. The name of the folder containing the source content model to be synchronized.
 * @param {string} [params.sourceEnvironmentId] - Optional. The ID of the source environment from which the content model will be fetched.
 * @param {string} [params.sourceApiKey] - Optional. The API key for accessing the source environment.
 * @param {LogOptions} params.logOptions - Optional. Configuration for logging options such as log level, output, etc.
 *
 * @returns {Promise<void>} A promise that resolves when the synchronization is complete.
 */
export const syncRun = (params: SyncRunParams) => syncRunInternal(params, "sync-run-API");

export const syncRunInternal = async (
  params: SyncRunParams,
  commandName: string,
  withDiffModel: (diffModel: DiffModel) => Promise<void> = () => Promise.resolve(),
) => {
  const targetEnvironmentClient = createClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
    commandName,
    baseUrl: params.kontentUrl,
  });

  if ("folderName" in params) {
    return await syncFromFolder(params, targetEnvironmentClient, withDiffModel);
  }
  return await syncFromRemote(params, targetEnvironmentClient, commandName, withDiffModel);
};

const syncFromFolder = async (
  params: Extract<SyncRunParams, { folderName: string }>,
  targetClient: ManagementClient,
  withDiffModel: (diffModel: DiffModel) => Promise<void>,
) => {
  const sourceModel = await getSourceModelFromFolder(params.folderName, params.entities);

  const fetchDependencies = new Set(
    Object.keys(params.entities).flatMap(e => syncEntityDependencies[e as SyncEntityName]),
  );

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetModel(
    targetClient,
    sourceModel,
    fetchDependencies,
    params,
  );

  const [filteredSourceModel, filteredTargetModel] = filterEnvModels(
    sourceModel,
    transformedTargetModel,
    params.entities,
  );

  const diffOperations = diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: filteredTargetModel,
    sourceEnvModel: filteredSourceModel,
  });

  logInfo(params, "standard", "Validating patch operations...\n");

  try {
    await validateTargetEnvironment(diffOperations, targetClient);
  } catch (e) {
    throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  }

  await withDiffModel(diffOperations);

  await sync(
    targetClient,
    diffOperations,
    new Set(Object.keys(params.entities)) as ReadonlySet<SyncEntityName>,
    params,
  );
};

const syncFromRemote = async (
  params: Extract<SyncRunParams, { sourceEnvironmentId: string }>,
  targetClient: ManagementClient,
  commandName: string,
  withDiffModel: (diffModel: DiffModel) => Promise<void>,
) => {
  const fetchDependencies = new Set(
    Object.keys(params.entities).flatMap(e => syncEntityDependencies[e as SyncEntityName]),
  );

  const sourceClient = createClient({
    environmentId: params.sourceEnvironmentId,
    apiKey: params.sourceApiKey,
    commandName,
    baseUrl: params.kontentUrl,
  });

  const sourceModel = await getSourceModelFromRemote(sourceClient, fetchDependencies, params);

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetModel(
    targetClient,
    sourceModel,
    fetchDependencies,
    params,
  );

  const [filteredSourceModel, filteredTargetModel] = filterEnvModels(
    sourceModel,
    transformedTargetModel,
    params.entities,
  );

  const diffOperations = diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: filteredTargetModel,
    sourceEnvModel: filteredSourceModel,
  });

  logInfo(params, "standard", "Validating patch operations...\n");

  try {
    await validateTargetEnvironment(diffOperations, targetClient);
  } catch (e) {
    throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  }

  await withDiffModel(diffOperations);

  await sync(
    targetClient,
    diffOperations,
    new Set(Object.keys(params.entities)) as ReadonlySet<SyncEntityName>,
    params,
  );
};
const getSourceModelFromRemote = (
  client: ManagementClient,
  fetchDependencies: Set<SyncEntityName>,
  logOptions: LogOptions,
) =>
  fetchSourceSyncModel(
    client,
    fetchDependencies,
    logOptions,
  );

const getSourceModelFromFolder = async (folderName: string, entities: SyncEntities): Promise<FileContentModel> => {
  const folderErrors = await validateSyncModelFolder(folderName);
  if (folderErrors.length) {
    return Promise.reject(folderErrors);
  }

  return await getSourceSyncModelFromFolder(
    folderName,
    new Set(Object.keys(entities)) as ReadonlySet<SyncEntityName>,
  ).catch(e => {
    if (e instanceof AggregateError) {
      throw new Error(`Parsing model validation errors:\n${e.errors.map(e => e.message).join("\n")}`);
    }
    throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  });
};

const getTargetModel = async (
  targetClient: ManagementClient,
  sourceModel: FileContentModel,
  fetchDependencies: Set<SyncEntityName>,
  logOptions: LogOptions,
) => {
  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  return await getTargetContentModel(
    targetClient,
    allCodenames,
    logOptions,
    fetchDependencies,
  );
};

const filterEnvModels = (sourceModel: FileContentModel, targetModel: FileContentModel, entities: SyncEntities) =>
  [filterModel(sourceModel, entities), filterModel(targetModel, entities)] as const;

const validateTargetEnvironment = async (
  diffModel: DiffModel,
  targetClient: ManagementClient,
) => {
  const diffErrors = await validateDiffedModel(targetClient, diffModel);

  if (diffErrors.length) {
    return Promise.reject(diffErrors);
  }
};
