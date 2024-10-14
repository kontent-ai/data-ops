import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import StreamZip from "node-stream-zip";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { serially } from "../../utils/requests.js";
import { assetFoldersEntity } from "./importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "./importExportEntities/entities/assets.js";
import { collectionsEntity } from "./importExportEntities/entities/collections.js";
import { contentItemsEntity } from "./importExportEntities/entities/contentItems.js";
import {
  contentTypesEntity,
  updateItemAndTypeReferencesInTypesImportEntity,
} from "./importExportEntities/entities/contentTypes.js";
import {
  contentTypesSnippetsEntity,
  updateItemAndTypeReferencesInSnippetsImportEntity,
} from "./importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./importExportEntities/entities/languages.js";
import { languageVariantsEntity } from "./importExportEntities/entities/languageVariants.js";
import { previewUrlsEntity } from "./importExportEntities/entities/previewUrls.js";
import { spacesEntity } from "./importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "./importExportEntities/entities/taxonomies.js";
import { webhooksEntity } from "./importExportEntities/entities/webhooks.js";
import { webSpotlightEntity } from "./importExportEntities/entities/webSpotlight.js";
import { importWorkflowScopesEntity, workflowsEntity } from "./importExportEntities/entities/workflows.js";
import { EntityDefinition, EntityImportDefinition, ImportContext } from "./importExportEntities/entityDefinition.js";
import { IncludeExclude, includeExcludePredicate } from "./utils/includeExclude.js";

// The entities will be imported in the order specified here.
// Keep in mind that there are dependencies between entities so the order is important.
export const importEntityDefinitions = [
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
] as const satisfies ReadonlyArray<EntityImportDefinition<any>>;

export const importEntityChoices = importEntityDefinitions.filter(e => !("isDependentOn" in e)).map(e => e.name);

export type ImportEntityChoices = typeof importEntityChoices[number];

export type ImportEnvironmentParams = Readonly<
  & {
    environmentId: string;
    fileName: string;
    apiKey: string;
  }
  & IncludeExclude<ImportEntityChoices>
  & LogOptions
>;

export const importEnvironment = async (params: ImportEnvironmentParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: "environment-import-API",
  });

  await importEnvironmentInternal(client, params);
};

export const importEnvironmentInternal = async (client: ManagementClient, params: ImportEnvironmentParams) => {
  const root = new StreamZip.async({ file: params.fileName });

  const definitionsToImport = importEntityDefinitions
    .filter(includeExcludePredicate(params));

  logInfo(
    params,
    "standard",
    `Importing entities from ${chalk.blue(params.fileName)} into environment id ${params.environmentId}\n`,
  );

  let context = createInitialContext();

  await serially(definitionsToImport.map(def => async () => {
    logInfo(params, "standard", `Importing: ${chalk.yellow(def.displayName)}`);

    try {
      context = await root.entryData(`${def.name}.json`)
        .then(b => b.toString("utf8"))
        .then(def.deserializeEntities)
        .then(e => (def as EntityDefinition<unknown>).importEntities(client, e, context, params, root))
        ?? context;
    } catch (err) {
      throw new Error(`Failed to import entity ${chalk.red(def.displayName)}.
        ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
    }
  }));

  logInfo(params, "standard", chalk.green("All entities were successfully imported."));
};

const createInitialContext = (): ImportContext => ({
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
