import { logError, LogOptions } from "../log.js";
import { validateContentFolder } from "../modules/sync/validation.js";
import { RegisterCommand } from "../types/yargs.js";

export const register: RegisterCommand = yargs =>
  yargs.command(
    {
      command: "sync",
      describe: "Synchronize content model by model in file",
      builder: yargs =>
        yargs
          .option("fileName", {
            type: "string",
            describe: "Name of the json file with content model",
            demandOption: "You need to provide the filename of the json file to sync content model",
            alias: "f",
          })
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
          }),
      handler: args => syncContentModel(args),
    },
  );

export type SyncParams =
  & Readonly<{
    environmentId: string;
    fileName: string;
    apiKey: string;
  }>
  & LogOptions;

export const syncContentModel = async (params: SyncParams) => {
  const folderErrors = await validateContentFolder(params.fileName);
  if (folderErrors.length) {
    folderErrors.forEach(e => logError(params, "standard", e));
    process.exit(1);
  }

  // uncomment when dealing with sync
  // const modelErrors = await validateContentModel(sourceModel, targetModel);
};
