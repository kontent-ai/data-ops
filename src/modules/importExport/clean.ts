import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { serially } from "../../utils/requests.js";
import { SuperiorOmit } from "../../utils/types.js";
import { assetFoldersEntity } from "./importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "./importExportEntities/entities/assets.js";
import { collectionsEntity } from "./importExportEntities/entities/collections.js";
import { contentItemsEntity } from "./importExportEntities/entities/contentItems.js";
import { contentTypesEntity } from "./importExportEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "./importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./importExportEntities/entities/languages.js";
import { previewUrlsEntity } from "./importExportEntities/entities/previewUrls.js";
import { spacesEntity } from "./importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "./importExportEntities/entities/taxonomies.js";
import { webhooksEntity } from "./importExportEntities/entities/webhooks.js";
import { webSpotlightEntity } from "./importExportEntities/entities/webSpotlight.js";
import { workflowsEntity } from "./importExportEntities/entities/workflows.js";
import { EntityDefinition } from "./importExportEntities/entityDefinition.js";
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
  const client = createClient({ environmentId: params.environmentId, apiKey: params.apiKey, commandName: "clean-API" });

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
