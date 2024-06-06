import { createDeliveryClient } from "@kontent-ai/delivery-sdk";
import { exportAsync, getDefaultLogger, storeAsync } from "@kontent-ai/migration-toolkit";

import { LogOptions } from "../../../log.js";
import { getItemsCodenames } from "../../../modules/syncContent/syncContent.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "export";
const itemsFilterParams = ["items", "filter", "last", "byTypesCodenames"] as const;

export const register: RegisterCommand = yargs =>
  yargs.command(
    {
      command: commandName,
      describe: "Generates content json file used for sync-content from Kontent.ai environment.",
      builder: yargs =>
        yargs
          .option("sourceEnvironmentId", {
            type: "string",
            describe: "Id of Kontent.ai environmnent containing source content model.",
            demandOption: "You need to provide the environmentId for source Kontent.ai environment.",
            alias: "s",
          })
          .option("sourceApiKey", {
            type: "string",
            describe: "Management Api key of Kontent.ai environmnent containing source content model.",
            demandOption: "You need to provide a Management API key for source Kontent.ai environment.",
            alias: "sk",
          })
          .option("sourceDeliveryPreviewKey", {
            type: "string",
            describe:
              "Delivery Preview Api key of Kontent.ai environmnent containing source content model. Use only when you want obtain codenames via delivery client.",
            alias: "sd",
          })
          .option("language", {
            type: "string",
            describe: "Defines language, for which content items will be migrated.",
            demandOption: "You need to provide language.",
            alias: "l",
          })
          .option("items", {
            type: "array",
            string: true,
            describe: "Array of content items codenames to be migrated.",
            alias: "i",
            conflicts: itemsFilterParams.filter(p => p !== "items"),
          })
          .option("filename", {
            type: "string",
            describe: "Filename where items should be stored.",
            alias: "f",
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
          .option("filter", {
            type: "string",
            describe: "A filter to obtain a subset of items codenames. See Delivery sdk for more info",
            conflicts: itemsFilterParams.filter(p => p !== "filter"),
          })
          .option("skipConfirmation", {
            type: "boolean",
            describe: "Skip confirmation message.",
          }),
      handler: args => generateSyncContent(args).catch(simplifyErrors),
    },
  );

type ExportSyncContentParams =
  & Readonly<{
    sourceEnvironmentId: string;
    sourceApiKey: string;
    sourceDeliveryPreviewKey?: string;
    language: string;
    filename?: string;
    items?: ReadonlyArray<string>;
    last?: number;
    depth?: number;
    limit?: number;
    byTypeCodenames?: ReadonlyArray<string>;
    filter?: string;
    skipConfirmation?: boolean;
  }>
  & LogOptions;

export const generateSyncContent = async (params: ExportSyncContentParams) => {
  const deliveryClient = createDeliveryClient({
    environmentId: params.sourceEnvironmentId,
    previewApiKey: params.sourceDeliveryPreviewKey,
    defaultQueryConfig: { usePreviewMode: true },
  });

  const itemsCodenames = await getItemsCodenames(deliveryClient, params);

  const data = await exportAsync({
    environmentId: params.sourceEnvironmentId,
    apiKey: params.sourceApiKey,
    exportItems: itemsCodenames.map(i => ({ itemCodename: i, languageCodename: params.language })),
    logger: getDefaultLogger(),
  });

  await storeAsync({
    data,
    filename: params.filename,
  });
};
