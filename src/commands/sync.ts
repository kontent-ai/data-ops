import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logError, logInfo, LogOptions } from "../log.js";
import { diff } from "../modules/sync/diff.js";
import { fetchModel, transformSyncModel } from "../modules/sync/generateSyncModel.js";
import { printDiff } from "../modules/sync/printDiff.js";
import { sync } from "../modules/sync/sync.js";
import { requestConfirmation } from "../modules/sync/utils/consoleHelpers.js";
import {
  getSourceItemAndAssetCodenames,
  getTargetContentModel,
  readContentModelFromFolder,
} from "../modules/sync/utils/getContentModel.js";
import { validateContentFolder, validateContentModel, validateDiffedModel } from "../modules/sync/validation.js";
import { RegisterCommand } from "../types/yargs.js";
import { throwError } from "../utils/error.js";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: "sync",
    describe: "Synchronize content model between two Kontent.ai environments",
    builder: yargs =>
      yargs
        .option("targetEnvironmentId", {
          type: "string",
          describe: "Id of the target Kontent.ai environment.",
          demandOption: "You need to provide the environmentId of your Kontent.ai environment",
          alias: "t",
        })
        .option("targetApiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
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
            "Id of Kontent.ai environmnent containing source content model. Must be used --sourceApiKey. with Can't be used at the same time with option --folderName",
          conflicts: "folderName",
          implies: ["sourceApiKey"],
          alias: "s",
        })
        .option("sourceApiKey", {
          type: "string",
          describe:
            "Management API key of Kontent.ai environmnent containing source content model. Must be used --sourceEnvironmentId. Can't be used at the same time with option --folderName",
          conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
          alias: "sk",
        })
        .option("skipWarning", {
          type: "boolean",
          describe: "Skip warning message.",
          alias: "sw",
        }),
    handler: args => syncContentModel(args),
  });

export type SyncParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    folderName?: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
    skipWarning?: boolean;
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
        new ManagementClient({
          environmentId: params.sourceEnvironmentId ?? throwError("sourceEnvironmentId should not be undefined"),
          apiKey: params.sourceApiKey ?? throwError("sourceApiKey should not be undefined"),
        }),
      ),
      params,
    );

  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  const targetEnvironmentClient = new ManagementClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
  });

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetContentModel(
    targetEnvironmentClient,
    allCodenames,
    params,
  );

  const modelErrors = await validateContentModel(sourceModel, transformedTargetModel);
  checkValidation(modelErrors, params);

  const diffModel = diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });

  printDiff(diffModel, params);

  logInfo(params, "standard", "Validating patch operations...\n");

  const diffErrors = await validateDiffedModel(
    new ManagementClient({
      apiKey: params.targetApiKey,
      environmentId: params.targetEnvironmentId,
    }),
    diffModel,
  );

  checkValidation(diffErrors, params);

  const warningMessage = chalk.yellow(
    `⚠ Running this operation may result in irreversible changes to the content in environment ${params.targetEnvironmentId}. Mentoined changes might include:
- Removing content due to element deletion
OK to proceed y/n? (suppress this message with -s parameter)\n`,
  );

  const confirmed = !params.skipWarning ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    logInfo(params, "standard", chalk.red("Operation aborted."));
    process.exit(1);
  }

  await sync(
    new ManagementClient({ environmentId: params.targetEnvironmentId, apiKey: params.targetApiKey }),
    diffModel,
  );
};

const checkValidation = (errors: ReadonlyArray<string>, logOptions: LogOptions) => {
  if (errors.length) {
    errors.forEach(e => logError(logOptions, "standard", e));
    logInfo(logOptions, "standard", chalk.red("Operation aborted"));
    process.exit(1);
  }
};
