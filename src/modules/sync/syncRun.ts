import { ManagementClient } from "@kontent-ai/management-sdk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { Expect } from "../../utils/types.js";
import { syncEntityDependencies, SyncEntityName } from "./constants/entities.js";
import { diff } from "./diff.js";
import { filterModel } from "./generateSyncModel.js";
import { sync } from "./sync.js";
import { DiffModel } from "./types/diffModel.js";
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
  });

  const diffModel = await getDiffModel(params, targetEnvironmentClient, commandName);

  logInfo(params, "standard", "Validating patch operations...\n");

  try {
    await validateTargetEnvironment(diffModel, targetEnvironmentClient);
  } catch (e) {
    throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  }

  await withDiffModel(diffModel);

  await sync(
    targetEnvironmentClient,
    diffModel,
    new Set(Object.keys(params.entities)) as ReadonlySet<SyncEntityName>,
    params,
  );
};

const getDiffModel = async (
  params: SyncRunParams,
  targetClient: ManagementClient,
  commandName: string,
) => {
  if ("folderName" in params) {
    const folderErrors = await validateSyncModelFolder(params.folderName);
    if (folderErrors.length) {
      return Promise.reject(folderErrors);
    }
  }

  const fetchDependencies = new Set(
    Object.keys(params.entities).flatMap(e => syncEntityDependencies[e as SyncEntityName]),
  );

  const sourceModel = "folderName" in params
    ? await getSourceSyncModelFromFolder(
      params.folderName,
      new Set(Object.keys(params.entities)) as ReadonlySet<SyncEntityName>,
    ).catch(e => {
      if (e instanceof AggregateError) {
        throw new Error(`Parsing model validation errors:\n${e.errors.map(e => e.message).join("\n")}`);
      }
      throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
    })
    : await fetchSourceSyncModel(
      createClient({
        environmentId: params.sourceEnvironmentId,
        apiKey: params.sourceApiKey,
        commandName,
      }),
      fetchDependencies,
      params,
    );

  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetContentModel(
    targetClient,
    allCodenames,
    params,
    fetchDependencies,
  );

  const filteredSourceModel = filterModel(sourceModel, params.entities);
  const filteredTargetModel = filterModel(transformedTargetModel, params.entities);

  return diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: filteredTargetModel,
    sourceEnvModel: filteredSourceModel,
  });
};

export const validateTargetEnvironment = async (
  diffModel: DiffModel,
  targetClient: ManagementClient,
) => {
  const diffErrors = await validateDiffedModel(targetClient, diffModel);

  if (diffErrors.length) {
    return Promise.reject(diffErrors);
  }
};
