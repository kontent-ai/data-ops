import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import StreamZip from "node-stream-zip";

import { logInfo, LogOptions } from "../../log.js";
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
import { previewUrlsEntity } from "./backupRestoreEntities/entities/previewUrls.js";
import { spacesEntity } from "./backupRestoreEntities/entities/spaces.js";
import { taxonomiesEntity } from "./backupRestoreEntities/entities/taxonomies.js";
import { webhooksEntity } from "./backupRestoreEntities/entities/webhooks.js";
import { webSpotlightEntity } from "./backupRestoreEntities/entities/webSpotlight.js";
import { importWorkflowScopesEntity, workflowsEntity } from "./backupRestoreEntities/entities/workflows.js";
import {
  EntityDefinition,
  EntityRestoreDefinition,
  RestoreContext,
  RestoreOptions,
} from "./backupRestoreEntities/entityDefinition.js";
import { IncludeExclude, includeExcludePredicate } from "./utils/includeExclude.js";

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
  webSpotlightEntity,
  contentItemsEntity,
  updateItemAndTypeReferencesInSnippetsImportEntity,
  updateItemAndTypeReferencesInTypesImportEntity,
  workflowsEntity,
  spacesEntity,
  previewUrlsEntity,
  languageVariantsEntity,
  importWorkflowScopesEntity,
  webhooksEntity,
] as const satisfies ReadonlyArray<EntityRestoreDefinition<any>>;

export const restoreEntityChoices = restoreEntityDefinitions.filter(e => !("isDependentOn" in e)).map(e => e.name);

export type RestoreEntityChoices = typeof restoreEntityChoices[number];

export type RestoreEnvironmentParams = Readonly<
  & {
    environmentId: string;
    fileName: string;
    apiKey: string;
    kontentUrl?: string;
    options?: RestoreOptions;
  }
  & IncludeExclude<RestoreEntityChoices>
  & LogOptions
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

export const restoreEnvironmentInternal = async (client: ManagementClient, params: RestoreEnvironmentParams) => {
  const root = new StreamZip.async({ file: params.fileName });

  const definitionsToImport = restoreEntityDefinitions
    .filter(includeExcludePredicate(params));

  logInfo(
    params,
    "standard",
    `Restoring entities from ${chalk.blue(params.fileName)} into environment id ${params.environmentId}\n`,
  );

  let context = createInitialContext();

  await serially(definitionsToImport.map(def => async () => {
    logInfo(params, "standard", `Importing: ${chalk.yellow(def.displayName)}`);

    try {
      context = await root.entryData(`${def.name}.json`)
        .then(b => b.toString("utf8"))
        .then(def.deserializeEntities)
        .then(e =>
          (def as EntityDefinition<unknown>).importEntities(client, {
            entities: e,
            context,
            logOptions: params,
            zip: root,
            options: params.options,
          })
        )
        ?? context;
    } catch (err) {
      throw new Error(`Failed to import entity ${chalk.red(def.displayName)}.
        ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
    }
  }));

  logInfo(params, "standard", chalk.green("All entities were successfully imported."));
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
