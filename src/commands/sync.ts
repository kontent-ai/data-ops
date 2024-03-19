import { LogOptions } from "../log.js";
import { RegisterCommand } from "../types/yargs.js";

export const sync: RegisterCommand = yargs =>
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

export const syncContentModel = (params: SyncParams) => {
  // TODO
  params as never;
};
