import readline from "node:readline";

import { ManagementClient, SharedModels } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logError, logInfo, LogOptions } from "../../log.js";
import { assetFoldersEntity } from "../../modules/importExport/importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "../../modules/importExport/importExportEntities/entities/assets.js";
import { collectionsEntity } from "../../modules/importExport/importExportEntities/entities/collections.js";
import { contentItemsEntity } from "../../modules/importExport/importExportEntities/entities/contentItems.js";
import { contentTypesEntity } from "../../modules/importExport/importExportEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "../../modules/importExport/importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "../../modules/importExport/importExportEntities/entities/languages.js";
import { previewUrlsEntity } from "../../modules/importExport/importExportEntities/entities/previewUrls.js";
import { spacesEntity } from "../../modules/importExport/importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "../../modules/importExport/importExportEntities/entities/taxonomies.js";
import { webhooksEntity } from "../../modules/importExport/importExportEntities/entities/webhooks.js";
import { workflowsEntity } from "../../modules/importExport/importExportEntities/entities/workflows.js";
import { EntityDefinition } from "../../modules/importExport/importExportEntities/entityDefinition.js";
import { RegisterCommand } from "../../types/yargs.js";
import { serially } from "../../utils/requests.js";
import { isSpotlightInUseError } from "../../utils/typeguards.js";

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
  previewUrlsEntity,
  workflowsEntity,
  collectionsEntity,
  languagesEntity,
  webhooksEntity,
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
        })
        .option("skipWarning", {
          type: "boolean",
          describe: "Skip warning message.",
          alias: "s",
        }),
    handler: (args) => cleanEnvironment(args),
  });

type CleanEnvironmentParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    include?: ReadonlyArray<string>;
    exclude?: ReadonlyArray<string>;
    skipWarning?: boolean;
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

  const warningMessage = chalk.yellow(
    `⚠ Running this operation may result in irreversible changes to the content in environment ${params.environmentId}.\n\nOK to proceed y/n? (suppress this message with -s parameter)\n`,
  );

  const confirmed = !params.skipWarning ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    logError(params, chalk.red("Operation aborted."));
    process.exit(1);
  }

  logInfo(
    params,
    "standard",
    `Cleaning entities from ${chalk.blue(params.environmentId)}.`,
  );

  await serially(
    entitiesToClean.map(def => async () => {
      logInfo(params, "standard", `Removing ${chalk.yellow(def.displayName)}`);

      const entities = await def.fetchEntities(client);
      return def.cleanEntities(client, entities, params).catch(err => handleError(params, err, def));
    }),
  ).then(res => {
    const spotlightWarning = res.filter(
        e => e instanceof SharedModels.ContentManagementBaseKontentError,
      ).length
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

const getErrorMessages = (
  err: any,
) =>
  [
    ...err instanceof SharedModels.ContentManagementBaseKontentError
      ? [err.message, ...err.validationErrors.map(e => e.message)]
      : [err.message ?? JSON.stringify(err, Object.getOwnPropertyNames(err))],
  ].join("\n");

const handleError = <T extends LogOptions>(
  params: T,
  err: any,
  entity: EntityDefinition<T>,
) => {
  if (isSpotlightInUseError(err)) {
    return err;
  } else {
    logError(
      params,
      `Failed to clean entity ${chalk.red(entity.displayName)}.`,
      `Message: ${getErrorMessages(err)}`,
      "\nStopping clean operation...",
    );
    process.exit(1);
  }
};

const requestConfirmation = async (message: string) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
};
