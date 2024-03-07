import { LogOptions } from "../log.js";
import { generateSyncModelToFile } from "../modules/sync/generateSyncModel.js";
import { RegisterCommand } from "../types/yargs.js";

export const generateSyncModel: RegisterCommand = yargs =>
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
          .option("fileName", {
            type: "string",
            describe: "Name of the json file with content model",
            alias: "f",
          }),
      handler: args => generateModel(args),
    },
  );

export type SyncParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    fileName?: string;
  }>
  & LogOptions;

export const generateModel = (params: SyncParams) => {
  // TODO
  generateSyncModelToFile(params);
};
