import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { serially } from "../../utils/requests.js";
import { SuperiorOmit } from "../../utils/types.js";
import { assetFoldersEntity } from "./backupRestoreEntities/entities/assetFolders.js";
import { assetsEntity } from "./backupRestoreEntities/entities/assets.js";
import { collectionsEntity } from "./backupRestoreEntities/entities/collections.js";
import { contentItemsEntity } from "./backupRestoreEntities/entities/contentItems.js";
import { contentTypesEntity } from "./backupRestoreEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "./backupRestoreEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./backupRestoreEntities/entities/languages.js";
import { previewUrlsEntity } from "./backupRestoreEntities/entities/previewUrls.js";
import { spacesEntity } from "./backupRestoreEntities/entities/spaces.js";
import { taxonomiesEntity } from "./backupRestoreEntities/entities/taxonomies.js";
import { webhooksEntity } from "./backupRestoreEntities/entities/webhooks.js";
import { webSpotlightEntity } from "./backupRestoreEntities/entities/webSpotlight.js";
import { workflowsEntity } from "./backupRestoreEntities/entities/workflows.js";
import { EntityDefinition } from "./backupRestoreEntities/entityDefinition.js";
import { IncludeExclude, includeExcludePredicate } from "./utils/includeExclude.js";

/**
 * order of this array corresponds with order of individual clean operations.
 */
const cleanEntityDefinitions = [
  webSpotlightEntity,
  spacesEntity,
  contentItemsEntity,
  taxonomiesEntity,
  assetsEntity,
  assetFoldersEntity,
  contentTypesEntity,
  contentTypesSnippetsEntity,
  previewUrlsEntity,
  workflowsEntity,
  collectionsEntity,
  languagesEntity,
  webhooksEntity,
] as const satisfies ReadonlyArray<EntityDefinition<any>>;

export const cleanEntityChoices = cleanEntityDefinitions.map(e => e.name);

export type CleanEntityChoices = typeof cleanEntityChoices[number];

export type CleanEnvironmentParams = Readonly<
  & {
    environmentId: string;
    apiKey: string;
  }
  & IncludeExclude<CleanEntityChoices>
  & LogOptions
>;

export const cleanEnvironment = async (params: CleanEnvironmentParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: "environment-clean-API",
  });

  await cleanEnvironmentInternal(params, client);
};

export const cleanEnvironmentInternal = async (
  params: SuperiorOmit<CleanEnvironmentParams, "apiKey">,
  client: ManagementClient,
): Promise<void> => {
  const entitiesToClean = cleanEntityDefinitions.filter(includeExcludePredicate(params));

  logInfo(
    params,
    "standard",
    `Cleaning entities from ${chalk.blue(params.environmentId)}.`,
  );

  await serially(
    entitiesToClean.map(def => async () => {
      logInfo(params, "standard", `Removing ${chalk.yellow(def.displayName)}`);

      const entities = await def.fetchEntities(client);

      return (def as EntityDefinition<unknown>)
        .cleanEntities(client, entities, params)
        .catch((e: unknown) => {
          throw new Error(
            `Failed to clean entity ${chalk.red(def.displayName)}.
          ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`,
          );
        });
    }),
  );

  logInfo(
    params,
    "standard",
    chalk.green("Environment clean finished successfully."),
  );
};
