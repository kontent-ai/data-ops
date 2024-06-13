import chalk from "chalk";

import { logError, logInfo, LogOptions } from "../../../log.js";
import { diff } from "../../../modules/sync/diff.js";
import { fetchModel, transformSyncModel } from "../../../modules/sync/generateSyncModel.js";
import { printDiff } from "../../../modules/sync/printDiff.js";
import { sync } from "../../../modules/sync/sync.js";
import { requestConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import {
  getSourceItemAndAssetCodenames,
  getTargetContentModel,
  readContentModelFromFolder,
} from "../../../modules/sync/utils/getContentModel.js";
import { validateContentFolder, validateDiffedModel } from "../../../modules/sync/validation.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors, throwError } from "../../../utils/error.js";

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
    handler: args => syncContentModel(args).catch(simplifyErrors),
  });

export type SyncParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    folderName?: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
    skipConfirmation?: boolean;
  }>
  & LogOptions;

export const syncContentModel = async (params: SyncParams) => {
  if (params.folderName) {
    const folderErrors = await validateContentFolder(params.folderName);
    checkValidation(folderErrors, params);
  }

  const sourceModel = params.folderName
    ? await readContentModelFromFolder(params.folderName)
    : transformSyncModel(
      await fetchModel(
        createClient({
          environmentId: params.sourceEnvironmentId ?? throwError("sourceEnvironmentId should not be undefined"),
          apiKey: params.sourceApiKey ?? throwError("sourceApiKey should not be undefined"),
          commandName,
        }),
      ),
      params,
    );

  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  const targetEnvironmentClient = createClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
    commandName,
  });

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetContentModel(
    targetEnvironmentClient,
    allCodenames,
    params,
  );

  const diffModel = diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });

  printDiff(diffModel, params);

  logInfo(params, "standard", "Validating patch operations...\n");

  const diffErrors = await validateDiffedModel(targetEnvironmentClient, diffModel);

  checkValidation(diffErrors, params);

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
    targetEnvironmentClient,
    diffModel,
    params,
  );
};

const checkValidation = (errors: ReadonlyArray<string>, logOptions: LogOptions) => {
  if (errors.length) {
    errors.forEach(e => logError(logOptions, "standard", e));
    logInfo(logOptions, "standard", chalk.red("Operation aborted"));
    process.exit(1);
  }
};
