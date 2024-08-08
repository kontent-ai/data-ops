import chalk from "chalk";
import { match, P } from "ts-pattern";

import { logError, logInfo, LogOptions } from "../../../log.js";
import { printDiff } from "../../../modules/sync/printDiff.js";
import { sync } from "../../../modules/sync/sync.js";
import { getDiffModel, SyncModelRunParams, validateTargetEnvironment } from "../../../modules/sync/syncModelRun.js";
import { requestConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "run";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Synchronize content model between two Kontent.ai environments.",
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
        .option("folderName", {
          type: "string",
          describe:
            "Name of the folder containing source content model. Can't be used with --sourceEnvironmentId and --sourceApiKey options.",
          alias: "f",
          conflicts: ["sourceApiKey", "sourceEnvironmentId"],
        })
        .option("sourceEnvironmentId", {
          type: "string",
          describe:
            "Id of Kontent.ai environment containing source content model. Must be used with --sourceApiKey. Can't be used at the same time with option --folderName",
          conflicts: "folderName",
          implies: ["sourceApiKey"],
          alias: "s",
        })
        .option("sourceApiKey", {
          type: "string",
          describe:
            "Management API key of Kontent.ai environment containing source content model. Must be used with --sourceEnvironmentId. Can't be used at the same time with option --folderName",
          conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
          alias: "sk",
        })
        .option("skipConfirmation", {
          type: "boolean",
          describe: "Skip confirmation message.",
        }),
    handler: args => syncModelRunCli(args).catch(simplifyErrors),
  });

type SyncModelRunCliParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    folderName?: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
    skipConfirmation?: boolean;
  }>
  & LogOptions;

const syncModelRunCli = async (params: SyncModelRunCliParams) => {
  const resolvedParams = resolveParams(params);

  const targetClient = createClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
    commandName,
  });

  const diffModel = await getDiffModel(resolvedParams, targetClient, commandName);

  logInfo(params, "standard", "Validating patch operations...\n");

  try {
    await validateTargetEnvironment(diffModel, targetClient);
  } catch (e) {
    logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
    process.exit(1);
  }

  printDiff(diffModel, params);

  const warningMessage = chalk.yellow(
    `⚠ Running this operation may result in irreversible changes to the content in environment ${params.targetEnvironmentId}. Mentoined changes might include:
- Removing content due to element deletion
OK to proceed y/n? (suppress this message with --sw parameter)\n`,
  );

  const confirmed = !params.skipConfirmation ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    logInfo(params, "standard", chalk.red("Operation aborted."));
    process.exit(1);
  }

  await sync(
    targetClient,
    diffModel,
    params,
  );
};

const resolveParams = (params: SyncModelRunCliParams): SyncModelRunParams =>
  match(params)
    .with(
      { sourceEnvironmentId: P.nonNullable, sourceApiKey: P.nonNullable },
      ({ sourceEnvironmentId, sourceApiKey }) => ({ ...params, sourceEnvironmentId, sourceApiKey }),
    )
    .with({ folderName: P.nonNullable }, ({ folderName }) => ({ ...params, folderName }))
    .otherwise(() => {
      logError(
        params,
        "You need to provide either 'folderName' or 'sourceEnvironmentId' with 'sourceApiKey' parameters",
      );
      process.exit(1);
    });
