import { logError, LogOptions } from "../../../log.js";
import {
  BackupEntityChoices,
  backupEntityChoices,
  backupEnvironmentInternal,
  BackupEnvironmentParams,
} from "../../../modules/backupRestore/backup.js";
import { resolveIncludeExcludeCliParams } from "../../../modules/backupRestore/utils/includeExclude.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";

const commandName = "backup";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Backs up data from the specified Kontent.ai project into a .zip file.",
    builder: yargs =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to back up.",
          demandOption: "You need to provide an id of the Kontent.ai environment.",
          alias: "e",
        })
        .option("fileName", {
          type: "string",
          describe: "Name of the zip file where the environment backup will be stored",
          alias: "f",
        })
        .option("apiKey", {
          type: "string",
          describe: "Kontent.ai Management API key",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("secureAssetDeliveryKey", {
          type: "string",
          describe:
            "You need to provide a asset delivery key when secure asset delivery is enabled for the given Kontent.ai environment.",
        })
        .option("include", {
          type: "array",
          describe: "Only back up specified entities.",
          alias: "i",
          choices: backupEntityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe: "Exclude the specified entities from the backup.",
          alias: "x",
          choices: backupEntityChoices,
          conflicts: "include",
        })
        .option("kontentUrl", {
          type: "string",
          describe: "Custom URL for Kontent.ai endpoints. Defaults to \"kontent.ai\".",
        }),
    handler: args => backupEnvironmentCli(args).catch(simplifyErrors),
  });

type BackupEnvironmentCliParams =
  & Readonly<{
    environmentId: string;
    fileName: string | undefined;
    apiKey: string;
    secureAssetDeliveryKey: string | undefined;
    include: ReadonlyArray<BackupEntityChoices> | undefined;
    exclude: ReadonlyArray<BackupEntityChoices> | undefined;
    kontentUrl: string | undefined;
  }>
  & LogOptions;

const backupEnvironmentCli = async (params: BackupEnvironmentCliParams): Promise<void> => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: `environment-${commandName}`,
    baseUrl: params.kontentUrl,
  });

  try {
    await backupEnvironmentInternal(client, resolveParams(params));
  } catch (e) {
    logError(params, `${JSON.stringify(e, Object.getOwnPropertyNames(e))}\nStopping backup...`);
    process.exit(1);
  }
};

const resolveParams = (params: BackupEnvironmentCliParams): BackupEnvironmentParams => ({
  ...omit(params, ["include", "exclude"]),
  ...resolveIncludeExcludeCliParams(params),
});
