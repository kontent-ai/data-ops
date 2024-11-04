import chalk from "chalk";
import { match, P } from "ts-pattern";

import { logError, logInfo, LogOptions } from "../../../log.js";
import {
  migrateContentRunInternal,
  MigrateContentRunParams,
} from "../../../modules/migrateContent/migrateContentRun.js";
import { requestConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";

const commandName = "run";
const itemsFilterParams = ["items", "filter", "last", "byTypesCodenames"] as const;

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Migrate specified (by codenames) content items between source and target environments.",
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
          describe: "Id of Kontent.ai environmnent containing source content.",
          alias: "s",
          implies: ["sourceApiKey"],
        })
        .option("sourceApiKey", {
          type: "string",
          describe: "Management Api key of Kontent.ai environmnent containing source content.",
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
          describe: "Continue when encounter the item that can't be migrated.",
        })
        .option("filter", {
          type: "string",
          describe: "A filter to obtain a subset of items codenames. See Delivery API docs for more information.",
          conflicts: itemsFilterParams.filter(p => p !== "filter"),
        })
        .option("skipConfirmation", {
          type: "boolean",
          describe: "Skip confirmation message.",
        })
        .option("kontentUrl", {
          type: "string",
          describe: "Custom URL for Kontent.ai endpoints. Defaults to \"kontent.ai\".",
        })
        .check((args) => {
          // when migrating by filename, whole file is migrated
          if (!args.filter && !args.items && !args.last && !args.byTypesCodenames && !args.filename) {
            return "You need to provide exactly one of the 'items', 'last', 'byTypesCodenames' or 'filter' parameters.";
          }
          if (!args.sourceEnvironmentId && !args.sourceApiKey && !args.filename) {
            return "You need to provide 'sourceEnvironmentId' with 'sourceApiKey' or 'filename' parameters.";
          }
          return true;
        }),
    handler: args => migrateContentRunCli(args).catch(simplifyErrors),
  });

type MigrateContentRunCliParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    sourceEnvironmentId: string | undefined;
    sourceApiKey: string | undefined;
    sourceDeliveryPreviewKey: string | undefined;
    filename: string | undefined;
    language: string | undefined;
    items: ReadonlyArray<string> | undefined;
    last: number | undefined;
    depth: number | undefined;
    limit: number | undefined;
    byTypesCodenames: ReadonlyArray<string> | undefined;
    filter: string | undefined;
    skipFailedItems: boolean | undefined;
    skipConfirmation: boolean | undefined;
    kontentUrl: string | undefined;
  }>
  & LogOptions;

const migrateContentRunCli = async (params: MigrateContentRunCliParams) => {
  const resolvedParams = resolveParams(params);

  migrateContentRunInternal(resolvedParams, "migrate-content-run", async () => {
    const warningMessage = chalk.yellow(
      `⚠ Running this operation may result in irreversible changes to the content in environment ${params.targetEnvironmentId}. 
OK to proceed y/n? (suppress this message with --sw parameter)\n`,
    );

    const confirmed = !params.skipConfirmation ? await requestConfirmation(warningMessage) : true;

    if (!confirmed) {
      logInfo(params, "standard", chalk.red("Operation aborted."));
      process.exit(1);
    }
  });
};

const resolveParams = (params: MigrateContentRunCliParams): MigrateContentRunParams => {
  const ommited = omit(params, ["sourceEnvironmentId", "sourceApiKey", "items", "filter", "last", "byTypesCodenames"]);

  if (params.filename) {
    return { ...ommited, filename: params.filename };
  }

  const filterParams = match(params)
    .with(
      { items: P.nonNullable, depth: P.nonNullable, sourceDeliveryPreviewKey: P.nonNullable },
      ({ items, depth, sourceDeliveryPreviewKey }) => ({ ...ommited, items, depth, sourceDeliveryPreviewKey }),
    )
    .with(
      { items: P.nonNullable },
      ({ items }) => ({ ...ommited, items }),
    )
    .with(
      { byTypesCodenames: P.nonNullable, sourceDeliveryPreviewKey: P.nonNullable },
      ({ byTypesCodenames, sourceDeliveryPreviewKey }) => ({ ...ommited, byTypesCodenames, sourceDeliveryPreviewKey }),
    )
    .with(
      { filter: P.nonNullable, sourceDeliveryPreviewKey: P.nonNullable },
      ({ filter, sourceDeliveryPreviewKey }) => ({ ...ommited, filter, sourceDeliveryPreviewKey }),
    )
    .with(
      { last: P.nonNullable, sourceDeliveryPreviewKey: P.nonNullable },
      ({ last, sourceDeliveryPreviewKey }) => ({ ...ommited, last, sourceDeliveryPreviewKey }),
    )
    .otherwise(() => {
      logError(
        params,
        "You need to provide exactly one from parameters: --items or --items with --depth, --filter, --byTypesCodenames, --last with --sourceDeliveryPreviewKey",
      );
      process.exit(1);
    });

  if (params.sourceEnvironmentId && params.sourceApiKey && params.language) {
    return {
      ...ommited,
      ...filterParams,
      sourceEnvironmentId: params.sourceEnvironmentId,
      sourceApiKey: params.sourceApiKey,
      language: params.language,
    };
  }

  logError(
    params,
    "You need to provide either 'filename' or 'sourceEnvironmentId' with 'sourceApiKey' and 'language' parameters",
  );
  process.exit(1);
};
