import type { ManagementClient } from "@kontent-ai/management-sdk";

import { type LogOptions, logInfo } from "../../log.js";
import { createClient } from "../../utils/client.js";
import type { Expect, Replace } from "../../utils/types.js";
import {
  type SyncEntityChoice,
  type SyncEntityName,
  syncEntityDependencies,
} from "./constants/entities.js";
import { diff } from "./diff.js";
import { filterModel } from "./generateSyncModel.js";
import { sync } from "./sync.js";
import type { DiffModel } from "./types/diffModel.js";
import type {
  AssetFolderSyncModel,
  CollectionSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  LanguageSyncModel,
  SpaceSyncModel,
  TaxonomySyncModel,
  WorkflowSyncModel,
} from "./types/syncModel.js";
import { normalizeSyncEntitiesAlias } from "./utils/entityAlias.js";
import {
  fetchSourceSyncModel,
  getSourceItemAndAssetCodenames,
  getSourceSyncModelFromFolder,
  getTargetContentModel,
} from "./utils/getContentModel.js";
import { validateDiffedModel, validateSyncModelFolder } from "./validation.js";

// biome-ignore lint/suspicious/noExplicitAny: The entity is in contravariant position and we need to allow all types so unknown is not possible and the only alternative is any
type ExpectedSyncEntities = Record<SyncEntityChoice, ((entity: any) => boolean) | boolean>;

export type SyncEntities = Partial<
  Expect<
    ExpectedSyncEntities,
    {
      contentTypes: (type: ContentTypeSyncModel) => boolean;
      contentTypeSnippets: (snippet: ContentTypeSnippetsSyncModel) => boolean;
      taxonomies: (taxonomy: TaxonomySyncModel) => boolean;
      assetFolders: (assetFolder: AssetFolderSyncModel) => boolean;
      collections: (collection: CollectionSyncModel) => boolean;
      spaces: (space: SpaceSyncModel) => boolean;
      languages: (language: LanguageSyncModel) => boolean;
      workflows: (workflow: WorkflowSyncModel) => boolean;
      livePreview: boolean;
      /** @deprecated Use `livePreview` instead. The alias is normalized to `livePreview` internally and will be removed in a future major version. */
      webSpotlight: boolean;
    }
  >
>;

export type SyncEntitiesInternal = Omit<SyncEntities, "webSpotlight">;

export type SyncRunParams = Readonly<
  {
    targetEnvironmentId: string;
    targetApiKey: string;
    entities: SyncEntities;
    kontentUrl?: string;
  } & ({ folderName: string } | { sourceEnvironmentId: string; sourceApiKey: string }) &
    LogOptions
>;

export type SyncRunParamsInternal = Replace<SyncRunParams, { entities: SyncEntitiesInternal }>;
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
  rawParams: SyncRunParams,
  commandName: string,
  withDiffModel: (
    diffModel: DiffModel,
    entities: ReadonlySet<SyncEntityName>,
  ) => Promise<void> = () => Promise.resolve(),
) => {
  const params = {
    ...rawParams,
    entities: normalizeSyncEntitiesAlias(rawParams.entities, rawParams),
  };

  const targetEnvironmentClient = createClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
    commandName,
    baseUrl: params.kontentUrl,
  });

  const diffModel = await getDiffModel(params, targetEnvironmentClient, commandName);

  logInfo(params, "standard", "Validating patch operations...\n");

  try {
    await validateTargetEnvironment(diffModel, targetEnvironmentClient);
  } catch (e) {
    throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  }

  const entitiesSet = new Set(Object.keys(params.entities)) as ReadonlySet<SyncEntityName>;

  await withDiffModel(diffModel, entitiesSet);

  await sync(targetEnvironmentClient, diffModel, entitiesSet, params);
};

const getDiffModel = async (
  params: SyncRunParamsInternal,
  targetClient: ManagementClient,
  commandName: string,
) => {
  if ("folderName" in params) {
    const folderErrors = await validateSyncModelFolder(
      params.folderName,
      Object.keys(params.entities) as ReadonlyArray<SyncEntityName>,
    );
    if (folderErrors.length) {
      return Promise.reject(folderErrors);
    }
  }

  const fetchDependencies = new Set(
    (Object.keys(params.entities) as SyncEntityName[]).flatMap((e) => syncEntityDependencies[e]),
  );

  const sourceModel =
    "folderName" in params
      ? await getSourceSyncModelFromFolder(params.folderName).catch((e) => {
          if (e instanceof AggregateError) {
            throw new Error(
              `Parsing model validation errors:\n${e.errors.map((e) => e.message).join("\n")}`,
            );
          }
          throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
        })
      : await fetchSourceSyncModel(
          createClient({
            environmentId: params.sourceEnvironmentId,
            apiKey: params.sourceApiKey,
            commandName,
            baseUrl: params.kontentUrl,
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
