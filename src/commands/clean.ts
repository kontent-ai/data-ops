import { ManagementClient, SharedModels } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { spotlightInUseErrorCode } from "../constants/ids.js";
import { logError, logInfo, LogOptions } from "../log.js";
import { RegisterCommand } from "../types/yargs.js";
import { serially } from "../utils/requests.js";
import { assetFoldersEntity } from "./importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "./importExportEntities/entities/assets.js";
import { collectionsEntity } from "./importExportEntities/entities/collections.js";
import { contentItemsEntity } from "./importExportEntities/entities/contentItems.js";
import { contentTypesEntity } from "./importExportEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "./importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./importExportEntities/entities/languages.js";
import { spacesEntity } from "./importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "./importExportEntities/entities/taxonomies.js";
import { workflowsEntity } from "./importExportEntities/entities/workflows.js";
import { EntityDefinition } from "./importExportEntities/entityDefinition.js";

/**
 * order of this array corresponds with order of individual clean operations.
 */
const entityDefinitions: ReadonlyArray<EntityDefinition<any>> = [
  spacesEntity,
  contentItemsEntity,
  taxonomiesEntity,
  assetsEntity,
  assetFoldersEntity,
  contentTypesEntity,
  contentTypesSnippetsEntity,
  workflowsEntity,
  collectionsEntity,
  languagesEntity,
];

const entityChoices = entityDefinitions.map(e => e.name);

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: "clean",
    describe: "Removes all content, assets and configuration from a Kontent.ai environment.",
    builder: (yargs) =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to clean.",
          demandOption: "You need to provide an id of the Kontent.ai environment.",
          alias: "e",
        })
        .option("apiKey", {
          type: "string",
          describe: "Kontent.ai Management API key",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("include", {
          type: "array",
          describe: "Only remove specified entities.",
          alias: "i",
          choices: entityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe: "Exclude specified entities from removal.",
          alias: "x",
          choices: entityChoices,
          conflicts: "include",
        }),
    handler: (args) => cleanEnvironment(args),
  });

type CleanEnvironmentParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    include?: ReadonlyArray<string>;
    exclude?: ReadonlyArray<string>;
  }>
  & LogOptions;

const cleanEnvironment = async (
  params: CleanEnvironmentParams,
): Promise<void> => {
  const client = new ManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
  });

  const entitiesToClean = entityDefinitions
    .filter(e => (!params.include || params.include.includes(e.name)) && !params.exclude?.includes(e.name));

  logInfo(
    params,
    "standard",
    `Cleaning entities from ${chalk.blue(params.environmentId)}.`,
  );

  await serially(
    entitiesToClean.map((def) => async () => {
      logInfo(params, "standard", `Removing ${chalk.yellow(def.name)}`);

      const entities = await def.fetchEntities(client);
      return def.cleanEntities(client, entities, params).catch((err) => handleError(params, err, def));
    }),
  ).then((res) => {
    const spotlightWarning = res.filter(
        (e) => e instanceof SharedModels.ContentManagementBaseKontentError,
      ).length > 0
      ? chalk.cyan(
        "\n⚠ Some types couldn't be deleted because Web Spotlight is enabled on the environment. Please disable Web Spotlight and run the clean operation again or remove the types manually.",
      )
      : "";

    logInfo(
      params,
      "standard",
      chalk.green(`Environment clean finished successfully.${spotlightWarning}`),
    );
  });
};

const getErrorMessages = (err: any) => {
  const messages: string[] = [];

  if (err instanceof SharedModels.ContentManagementBaseKontentError) {
    messages.push(err.message, ...err.validationErrors.map((e) => e.message));
  } else {
    messages.push(err.message ?? JSON.stringify(err));
  }

  return messages.join("\n");
};

const handleError = (
  params: CleanEnvironmentParams,
  err: any,
  entity: EntityDefinition<any>,
) => {
  if (
    err instanceof SharedModels.ContentManagementBaseKontentError
    && err.errorCode === spotlightInUseErrorCode
  ) {
    return err;
  } else {
    logError(
      params,
      `Failed to clean entity ${chalk.red(entity.name)}.`,
      `Message: ${getErrorMessages(err)}`,
      "\nStopping clean operation...",
    );
    process.exit(1);
  }
};
