import chalk from "chalk";

import { logError, logInfo, LogOptions } from "../../log.js";
import { fetchModel, saveSyncModel, transformSyncModel } from "../../modules/sync/generateSyncModel.js";
import { RegisterCommand } from "../../types/yargs.js";
import { createClient } from "../../utils/client.js";
import { simplifyErrors } from "../../utils/error.js";

export const register: RegisterCommand = yargs =>
  yargs.command(
    {
      command: "generate-sync-model",
      describe: "generates content model json file used for sync from Kontent.ai environment",
      builder: yargs =>
        yargs
          .option("environmentId", {
            type: "string",
            describe: "Id of the target Kontent.ai environment that should be synced",
            demandOption: "You need to provide the environmentId of the Kontent.ai to be synced",
            alias: "e",
          })
          .option("apiKey", {
            type: "string",
            describe: "Management API key of target Kontent.ai project",
            demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
            alias: "k",
          })
          .option("folderName", {
            type: "string",
            describe: "Name of the folder to generate content model into.",
            alias: "f",
          }),
      handler: args => generateModel(args).catch(simplifyErrors),
    },
  );

export type SyncParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folderName?: string;
  }>
  & LogOptions;

export const generateModel = async (params: SyncParams) => {
  logInfo(params, "standard", "Fetching the model from ", chalk.yellow(params.environmentId), ".");
  const environmentModel = await logOnError(
    params,
    chalk.red("Failed to fetch the model."),
    () => fetchModel(createClient({ environmentId: params.environmentId, apiKey: params.apiKey })),
  );

  logInfo(params, "standard", "Transforming the model.");
  const syncModel = transformSyncModel(environmentModel, params);

  const folderName = await logOnError(
    params,
    chalk.red("Failed to save the model into the file."),
    () => saveSyncModel({ syncModel, environmentId: params.environmentId, folderName: params.folderName }),
  );

  logInfo(params, "standard", `Model is successfully saved into a folder ${chalk.green(folderName)}.`);
};

const logOnError = async <T>(params: LogOptions, errorMessage: string, action: () => Promise<T>): Promise<T> => {
  try {
    return action();
  } catch (e) {
    logError(params, errorMessage, JSON.stringify(e));
    throw e;
  }
};
