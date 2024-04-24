import { logError, LogOptions } from "../log.js";
import { validateContentFolder } from "../modules/sync/validation.js";
import { RegisterCommand } from "../types/yargs.js";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: "sync",
    describe: "Synchronize content model between two Kontent.ai environments",
    builder: yargs =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the target Kontent.ai environment.",
          demandOption: "You need to provide the environmentId of your Kontent.ai environment",
          alias: "e",
        })
        .option("apiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("folderName", {
          type: "string",
          describe: "Name of the folder containing source content model",
          alias: "f",
          conflicts: ["sourceApiKey", "sourceEnvironmentId"],
        })
        .option("sourceEnvironmentId", {
          type: "string",
          describe: "Id of Kontent.ai environmnent containing source content model",
          conflicts: "folderName",
          implies: ["sourceApiKey"],
        })
        .option("sourceApiKey", {
          type: "string",
          describe: "Management API key of Kontent.ai environmnent containing source content model",
          conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
        }),
    handler: args => syncContentModel(args),
  });

export type SyncParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folderName?: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
  }>
  & LogOptions;

export const syncContentModel = async (params: SyncParams) => {
  if (params.folderName) {
    const folderErrors = await validateContentFolder(params.folderName);
    if (folderErrors.length) {
      folderErrors.forEach(e => logError(params, "standard", e));
      process.exit(1);
    }
  }

  // uncomment when dealing with sync
  // const modelErrors = await validateContentModel(sourceModel, targetModel);
};
