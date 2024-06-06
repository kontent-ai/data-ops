import { createDeliveryClient } from "@kontent-ai/delivery-sdk";
import { extractAsync, importAsync, migrateAsync } from "@kontent-ai/migration-toolkit";
import chalk from "chalk";

import { logError, logInfo, LogOptions } from "../../../log.js";
import { requestConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import { getItemsCodenames } from "../../../modules/syncContent/syncContent.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "run";
const itemsFilterParams = ["items", "filter", "last", "byTypesCodenames"] as const;

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Sync specified (by codenames) content items between source and target environments",
    builder: yargs =>
      yargs
        .option("targetEnvironmentId", {
          type: "string",
          describe: "Id of the target Kontent.ai environment.",
          demandOption: "You need to provide the environmentId for target Kontent.ai environment.",
          alias: "t",
        })
        .option("targetApiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment",
          demandOption: "You need to provide a Management API key for target Kontent.ai environment.",
          alias: "tk",
        })
        .option("sourceEnvironmentId", {
          type: "string",
          describe: "Id of Kontent.ai environmnent containing source content model.",
          alias: "s",
          implies: ["sourceApiKey"],
        })
        .option("sourceApiKey", {
          type: "string",
          describe: "Management Api key of Kontent.ai environmnent containing source content model.",
          alias: "sk",
          implies: ["sourceEnvironmentId"],
        })
        .option("sourceDeliveryPreviewKey", {
          type: "string",
          describe:
            "Delivery Api key of Kontent.ai environmnent containing source content model. Use only when you want obtain codenames via delivery client.",
          alias: "sd",
        })
        .option("filename", {
          type: "string",
          describe: "Path to a zip containing exported items",
          conflicts: itemsFilterParams,
          alias: "f",
        })
        .option("language", {
          type: "string",
          describe: "Defines language, for which content items will be migrated.",
          alias: "l",
        })
        .option("items", {
          type: "array",
          string: true,
          describe: "Array of content items codenames to be migrated.",
          alias: "i",
          conflicts: itemsFilterParams.filter(p => p !== "items"),
        })
        .option("last", {
          type: "number",
          describe: "Migrate x lastly modified items",
          conflicts: itemsFilterParams.filter(p => p !== "last"),
        })
        .option("byTypesCodenames", {
          type: "array",
          string: true,
          describe: "Migrate items of specified content types",
          conflicts: itemsFilterParams.filter(p => p !== "byTypesCodenames"),
        })
        .option("depth", {
          type: "number",
          describe:
            "Determines the level of linked items in Delivery API response. We encourage using with --limit to prevent hiting upper response limit.",
          conflicts: ["filter"],
        })
        .option("limit", {
          type: "number",
          describe:
            "Updates the limit for number of content items in one Delivery API response. For more information read the Delivery API docs.",
          conflicts: ["filter"],
        })
        .option("skipFailedItems", {
          type: "boolean",
          describe: "Continue when encounter the item that can't be synced.",
        })
        .option("filter", {
          type: "string",
          describe: "A filter to obtain a subset of items codenames. See Delivery sdk for more info.",
          conflicts: itemsFilterParams.filter(p => p !== "filter"),
        })
        .option("skipConfirmation", {
          type: "boolean",
          describe: "Skip confirmation message.",
        })
        .check((args) => {
          // when syncing by filename, whole file is synced
          if (!args.filter && !args.items && !args.last && !args.byTypesCodenames && !args.filename) {
            return "You need to provide exactly one of the 'items', 'last', 'byTypesCodenames' or 'filter' parameters.";
          }
          if (!args.sourceEnvironmentId && !args.sourceApiKey && !args.filename) {
            return "You need to provide 'sourceEnvironmentId' with 'sourceApiKey' or 'filename' parameters.";
          }
          return true;
        }),
    handler: args => migrateContent(args).catch(simplifyErrors),
  });

export type MigrationToolkitParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
    sourceDeliveryPreviewKey?: string;
    filename?: string;
    language?: string;
    items?: ReadonlyArray<string>;
    last?: number;
    depth?: number;
    limit?: number;
    byTypesCodenames?: ReadonlyArray<string>;
    filter?: string;
    skipFailedItems?: boolean;
    skipConfirmation?: boolean;
  }>
  & LogOptions;

const migrateContent = async (params: MigrationToolkitParams) => {
  if (params.filename) {
    const data = await extractAsync({ filename: params.filename });

    await importAsync({
      data: data,
      environmentId: params.targetEnvironmentId,
      apiKey: params.targetApiKey,
    });

    process.exit(0);
  }

  if (!params.sourceEnvironmentId) {
    logError(params, "You need to provide sourceEnvironmentId");
    process.exit(1);
  }

  if (!params.sourceApiKey) {
    logError(params, "You need to provide sourceApiKey");
    process.exit(1);
  }

  const language = params.language as string;

  const deliveryClient = createDeliveryClient({
    environmentId: params.sourceEnvironmentId,
    previewApiKey: params.sourceDeliveryPreviewKey,
    defaultQueryConfig: {
      usePreviewMode: true,
    },
  });

  const itemsCodenames = await getItemsCodenames(deliveryClient, params);

  if (!itemsCodenames.length) {
    logInfo(params, "standard", `No items to migrate`);
    process.exit(0);
  }

  logInfo(
    params,
    "standard",
    `Syncing ${itemsCodenames.length} items from ${params.sourceEnvironmentId} to ${params.targetEnvironmentId} ${
      itemsCodenames.length < 100 ? `with codenames:\n${itemsCodenames.join("\n")}` : ""
    }`,
  );

  const warningMessage = chalk.yellow(
    `⚠ Running this operation may result in changes to the content in environment ${params.targetEnvironmentId}. OK to proceed y/n? (suppress this message with --skipConfirmation parameter)\n`,
  );

  const confirmed = !params.skipConfirmation ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    logInfo(params, "standard", chalk.red("Operation aborted."));
    process.exit(1);
  }

  await migrateAsync({
    targetEnvironment: { apiKey: params.targetApiKey, environmentId: params.targetEnvironmentId },
    sourceEnvironment: {
      environmentId: params.sourceEnvironmentId,
      apiKey: params.sourceApiKey,
      items: itemsCodenames.map(i => ({ itemCodename: i, languageCodename: language })),
    },
  });

  logInfo(params, "standard", `All items sucessfuly migrated`);
};
