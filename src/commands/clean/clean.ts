import chalk from "chalk";

import { logError, LogOptions } from "../../log.js";
import {
  CleanEntityChoices,
  cleanEntityChoices,
  cleanEnvironmentInternal,
  CleanEnvironmentParams,
} from "../../modules/importExport/clean.js";
import { resolveIncludeExcludeCliParams } from "../../modules/importExport/utils/includeExclude.js";
import { requestConfirmation } from "../../modules/sync/utils/consoleHelpers.js";
import { RegisterCommand } from "../../types/yargs.js";
import { createClient } from "../../utils/client.js";
import { omit } from "../../utils/object.js";

export const commandName = "clean";

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
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
          choices: cleanEntityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe: "Exclude specified entities from removal.",
          alias: "x",
          choices: cleanEntityChoices,
          conflicts: "include",
        })
        .option("skipWarning", {
          type: "boolean",
          describe: "Skip warning message.",
          alias: "s",
        }),
    handler: (args) => cleanEnvironmentCli(args),
  });

type CleanEnvironmentCliParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    include?: ReadonlyArray<CleanEntityChoices>;
    exclude?: ReadonlyArray<CleanEntityChoices>;
    skipWarning?: boolean;
  }>
  & LogOptions;

const cleanEnvironmentCli = async (
  params: CleanEnvironmentCliParams,
): Promise<void> => {
  const warningMessage = chalk.yellow(
    `⚠ Running this operation may result in irreversible changes to the content in environment ${params.environmentId}.\n\nOK to proceed y/n? (suppress this message with -s parameter)\n`,
  );

  const confirmed = !params.skipWarning ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    logError(params, chalk.red("Operation aborted."));
    process.exit(1);
  }

  const client = createClient({ environmentId: params.environmentId, apiKey: params.apiKey, commandName });

  try {
    await cleanEnvironmentInternal(resolveParams(params), client);
  } catch (e) {
    handleError(params, e);
  }
};

const handleError = (
  logOptions: LogOptions,
  err: unknown,
) => {
  logError(
    logOptions,
    `${err}\nStopping clean operation...`,
  );

  process.exit(1);
};

const resolveParams = (params: CleanEnvironmentCliParams): CleanEnvironmentParams => ({
  ...omit(params, ["include", "exclude"]),
  ...resolveIncludeExcludeCliParams(params),
});
