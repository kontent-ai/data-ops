import type { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import StreamZip, { type StreamZipAsync } from "node-stream-zip";

import { type LogOptions, logInfo } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { serially } from "../../utils/requests.js";
import { assetFoldersEntity } from "./backupRestoreEntities/entities/assetFolders.js";
import { assetsEntity } from "./backupRestoreEntities/entities/assets.js";
import { collectionsEntity } from "./backupRestoreEntities/entities/collections.js";
import { contentItemsEntity } from "./backupRestoreEntities/entities/contentItems.js";
import {
  contentTypesEntity,
  updateItemAndTypeReferencesInTypesImportEntity,
} from "./backupRestoreEntities/entities/contentTypes.js";
import {
  contentTypesSnippetsEntity,
  updateItemAndTypeReferencesInSnippetsImportEntity,
} from "./backupRestoreEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./backupRestoreEntities/entities/languages.js";
import { languageVariantsEntity } from "./backupRestoreEntities/entities/languageVariants.js";
import { livePreviewEntity } from "./backupRestoreEntities/entities/livePreview.js";
import { previewUrlsEntity } from "./backupRestoreEntities/entities/previewUrls.js";
import { spacesEntity } from "./backupRestoreEntities/entities/spaces.js";
import { taxonomiesEntity } from "./backupRestoreEntities/entities/taxonomies.js";
import { webhooksEntity } from "./backupRestoreEntities/entities/webhooks.js";
import {
  importWorkflowScopesEntity,
  workflowsEntity,
} from "./backupRestoreEntities/entities/workflows.js";
import type {
  AnyEntityRestoreDefinition,
  EntityDefinition,
  RestoreContext,
  RestoreOptions,
} from "./backupRestoreEntities/entityDefinition.js";
import { type IncludeExclude, includeExcludePredicate } from "./utils/includeExclude.js";

// The entities will be imported in the order specified here.
// Keep in mind that there are dependencies between entities so the order is important.
export const restoreEntityDefinitions = [
  collectionsEntity,
  languagesEntity,
  taxonomiesEntity,
  assetFoldersEntity,
  assetsEntity,
  contentTypesSnippetsEntity,
  contentTypesEntity,
  livePreviewEntity,
  contentItemsEntity,
  updateItemAndTypeReferencesInSnippetsImportEntity,
  updateItemAndTypeReferencesInTypesImportEntity,
  workflowsEntity,
  spacesEntity,
  previewUrlsEntity,
  languageVariantsEntity,
  importWorkflowScopesEntity,
  webhooksEntity,
] as const satisfies ReadonlyArray<AnyEntityRestoreDefinition>;

export const restoreEntityChoices = restoreEntityDefinitions
  .filter((e) => !("isDependentOn" in e))
  .map((e) => e.name);

export type RestoreEntityChoices = (typeof restoreEntityChoices)[number];

export type RestoreEnvironmentParams = Readonly<
  {
    environmentId: string;
    fileName: string;
    apiKey: string;
    kontentUrl?: string;
    options?: RestoreOptions;
  } & IncludeExclude<RestoreEntityChoices> &
    LogOptions
>;

export const restoreEnvironment = async (params: RestoreEnvironmentParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: "environment-restore-API",
    baseUrl: params.kontentUrl,
  });

  await restoreEnvironmentInternal(client, params);
};

export const restoreEnvironmentInternal = async (
  client: ManagementClient,
  params: RestoreEnvironmentParams,
) => {
  const root = new StreamZip.async({ file: params.fileName });

  const definitionsToImport = restoreEntityDefinitions.filter(includeExcludePredicate(params));

  logInfo(
    params,
    "standard",
    `Restoring entities from ${chalk.blue(params.fileName)} into environment id ${params.environmentId}\n`,
  );

  let context = createInitialContext();

  await serially(
    definitionsToImport.map((def) => async () => {
      logInfo(params, "standard", `Importing: ${chalk.yellow(def.displayName)}`);

      try {
        const legacyNames = (def as EntityDefinition<unknown>).legacyNames;
        const serialized = await readEntryWithLegacyFallback(root, def.name, legacyNames);
        context =
          (await (def as EntityDefinition<unknown>).importEntities(client, {
            entities: def.deserializeEntities(serialized),
            context,
            logOptions: params,
            zip: root,
            options: params.options,
          })) ?? context;
      } catch (err) {
        throw new Error(`Failed to import entity ${chalk.red(def.displayName)}.
        ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
      }
    }),
  );

  logInfo(params, "standard", chalk.green("All entities were successfully imported."));
};

// Reads `${name}.json` from the ZIP; if that entry is missing, tries each legacy name
// in order until one resolves. The entity's deserializeEntities is responsible for
// shape normalization when a legacy entry is found.
const readEntryWithLegacyFallback = async (
  root: StreamZipAsync,
  name: string,
  legacyNames: ReadonlyArray<string> | undefined,
): Promise<string> => {
  const candidates = [name, ...(legacyNames ?? [])];
  for (const candidate of candidates) {
    const data = await root
      .entryData(`${candidate}.json`)
      .then((b) => b.toString("utf8"))
      .catch(() => undefined);
    if (data !== undefined) {
      return data;
    }
  }
  throw new Error(`ZIP entry "${name}.json" not found.`);
};

const createInitialContext = (): RestoreContext => ({
  collectionIdsByOldIds: new Map(),
  languageIdsByOldIds: new Map(),
  taxonomyGroupIdsByOldIds: new Map(),
  taxonomyTermIdsByOldIds: new Map(),
  assetFolderIdsByOldIds: new Map(),
  assetIdsByOldIds: new Map(),
  oldAssetCodenamesByIds: new Map(),
  contentTypeSnippetContextByOldIds: new Map(),
  contentItemContextByOldIds: new Map(),
  oldContentItemCodenamesByIds: new Map(),
  contentTypeContextByOldIds: new Map(),
  workflowIdsByOldIds: new Map(),
  workflowStepsIdsWithTransitionsByOldIds: new Map(),
  spaceIdsByOldIds: new Map(),
});
