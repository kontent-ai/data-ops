import { logError, LogOptions } from "../../log.js";
import {
  ExportEntityChoices,
  exportEntityChoices,
  exportEnvironmentInternal,
  ExportEnvironmentParams,
} from "../../modules/importExport/export.js";
import { resolveIncludeExcludeCliParams } from "../../modules/importExport/utils/includeExclude.js";
import { RegisterCommand } from "../../types/yargs.js";
import { createClient } from "../../utils/client.js";
import { simplifyErrors } from "../../utils/error.js";
import { omit } from "../../utils/object.js";

const commandName = "export";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Exports data from the specified Kontent.ai project into a .zip file.",
    builder: yargs =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to export.",
          demandOption: "You need to provide an id of the Kontent.ai environment.",
          alias: "e",
        })
        .option("fileName", {
          type: "string",
          describe: "Name of the zip file the environment will be exported to.",
          alias: "f",
        })
        .option("apiKey", {
          type: "string",
          describe: "Kontent.ai Management API key",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("include", {
          type: "array",
          describe: "Only export specified entities.",
          alias: "i",
          choices: exportEntityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe: "Exclude the specified entities from the export.",
          alias: "x",
          choices: exportEntityChoices,
          conflicts: "include",
        }),
    handler: args => exportEnvironmentCli(args).catch(simplifyErrors),
  });

type ExportEnvironmentCliParams =
  & Readonly<{
    environmentId: string;
    fileName?: string;
    apiKey: string;
    include?: ReadonlyArray<ExportEntityChoices>;
    exclude?: ReadonlyArray<ExportEntityChoices>;
  }>
  & LogOptions;

const exportEnvironmentCli = async (params: ExportEnvironmentCliParams): Promise<void> => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName,
  });

  try {
    await exportEnvironmentInternal(client, resolveParams(params));
  } catch (e) {
    logError(params, `${JSON.stringify(e, Object.getOwnPropertyNames(e))}\nStopping export...`);
    process.exit(1);
  }
};

const resolveParams = (params: ExportEnvironmentCliParams): ExportEnvironmentParams => ({
  ...omit(params, ["include", "exclude"]),
  ...resolveIncludeExcludeCliParams(params),
});
