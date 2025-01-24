import { logError, LogOptions } from "../../../log.js";
import {
  RestoreEntityChoices,
  restoreEntityChoices,
  restoreEnvironmentInternal,
  RestoreEnvironmentParams,
} from "../../../modules/backupRestore/restore.js";
import { resolveIncludeExcludeCliParams } from "../../../modules/backupRestore/utils/includeExclude.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";

const commandName = "restore";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Restores data into the specified Kontent.ai project.",
    builder: yargs =>
      yargs
        .option("fileName", {
          type: "string",
          describe: "Name of the zip file with back up up data to restore.",
          demandOption: "You need to provide the filename of the zip file to restore.",
          alias: "f",
        })
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to restore into",
          demandOption: "You need to provide the id of the Kontent.ai environment to restore into.",
          alias: "e",
        })
        .option("apiKey", {
          type: "string",
          describe: "Kontent.ai Management API key",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("include", {
          type: "array",
          describe:
            "Only restore specified entities. (Keep in mind that some entities depend on others and may fail if their dependencies are not included.)",
          alias: "i",
          choices: restoreEntityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe:
            "Exclude the specified entities from the restore. (Keep in mind that some entities depend on others and may fail if their dependencies are excluded.)",
          alias: "x",
          choices: restoreEntityChoices,
          conflicts: "include",
        })
        .option("excludeInactiveLanguages", {
          type: "boolean",
          describe: "Do not restore inactive languages.",
        })
        .option("kontentUrl", {
          type: "string",
          describe: "Custom URL for Kontent.ai endpoints. Defaults to \"kontent.ai\".",
        }),
    handler: args => restoreEnvironmentCli(args).catch(simplifyErrors),
  });

type RestoreEnvironmentCliParams =
  & Readonly<{
    environmentId: string;
    fileName: string;
    apiKey: string;
    include: ReadonlyArray<RestoreEntityChoices> | undefined;
    exclude: ReadonlyArray<RestoreEntityChoices> | undefined;
    excludeInactiveLanguages?: boolean;
    kontentUrl: string | undefined;
  }>
  & LogOptions;

const restoreEnvironmentCli = async (params: RestoreEnvironmentCliParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: `environment-${commandName}`,
    baseUrl: params.kontentUrl,
  });

  try {
    await restoreEnvironmentInternal(client, resolveParams(params));
  } catch (e: unknown) {
    logError(params, `${JSON.stringify(e, Object.getOwnPropertyNames(e))}\nStopping restoration...`);
    process.exit(1);
  }
};

const resolveParams = (params: RestoreEnvironmentCliParams): RestoreEnvironmentParams => ({
  ...omit(params, ["include", "exclude", "excludeInactiveLanguages"]),
  ...resolveIncludeExcludeCliParams(params),
  options: { excludeInactiveLanguages: params.excludeInactiveLanguages },
});
