import { logError, LogOptions } from "../../../log.js";
import { syncModelExportInternal } from "../../../modules/sync/syncModelExport.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "export";

export const register: RegisterCommand = yargs =>
  yargs.command(
    {
      command: commandName,
      describe: "Generates content model json files used for sync from Kontent.ai environment.",
      builder: yargs =>
        yargs
          .option("environmentId", {
            type: "string",
            describe: "The Id of the environment to export the content model from.",
            demandOption: "You need to provide the environmentId of the Kontent.ai to export the content model from.",
            alias: "e",
          })
          .option("apiKey", {
            type: "string",
            describe: "Management API key of target Kontent.ai environment.",
            demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
            alias: "k",
          })
          .option("folderName", {
            type: "string",
            describe: "Name of the folder to generate content model into.",
            alias: "f",
          }),
      handler: args => syncModelExportCli(args).catch(simplifyErrors),
    },
  );

type SyncModelExportCliParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folderName?: string;
  }>
  & LogOptions;

const syncModelExportCli = async (params: SyncModelExportCliParams) => {
  try {
    await syncModelExportInternal(
      params,
      createClient({
        environmentId: params.environmentId,
        apiKey: params.apiKey,
        commandName: "sync-model-export-API",
      }),
    );
  } catch (e) {
    logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
    process.exit(1);
  }
};
