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
        }),
    handler: (args) => cleanEnvironment(args),
  });

type CleanEnvironmentParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
  }>
  & LogOptions;

const cleanEnvironment = async (
  params: CleanEnvironmentParams,
): Promise<void> => {
  const client = new ManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
  });

  logInfo(
    params,
    "standard",
    `Cleaning all entities from ${chalk.blue(params.environmentId)}.`,
  );

  let isSpotlightEnabled = false;

  await serially(
    entityDefinitions.map((def) => async () => {
      logInfo(params, "standard", `Removing ${chalk.yellow(def.name)}`);

      try {
        const entities = await def.fetchEntities(client);
        await def.cleanEntities(client, entities, params);
      } catch (err) {
        const [errorMessage, errorCode] = err instanceof SharedModels.ContentManagementBaseKontentError
          ? [err.message, err.errorCode]
          : [JSON.stringify(err)];

        if (errorCode === spotlightInUseErrorCode) {
          isSpotlightEnabled = true;
        } else {
          logError(
            params,
            `Failed to clean entity ${chalk.red(def.name)}.`,
            `Message: ${errorMessage}`,
            "\nStopping clean operation...",
          );
          process.exit(1);
        }
      }
    }),
  );

  const spotlightWarning = isSpotlightEnabled
    ? chalk.cyan(
      "\n⚠ Some types couldn't be deleted because Web Spotlight is enabled on the environment. Please disable Web Spotlight and run the clean operation again or remove the types manually.",
    )
    : "";

  logInfo(
    params,
    "standard",
    chalk.green(`Environment clean finished successfully.${spotlightWarning}`),
  );
};
