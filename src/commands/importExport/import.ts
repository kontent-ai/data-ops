import { logError, LogOptions } from "../../log.js";
import {
  ImportEntityChoices,
  importEntityChoices,
  importEnvironmentInternal,
} from "../../modules/importExport/import.js";
import { RegisterCommand } from "../../types/yargs.js";
import { createClient } from "../../utils/client.js";
import { simplifyErrors } from "../../utils/error.js";

const commandName = "import";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Imports data into the specified Kontent.ai project.",
    builder: yargs =>
      yargs
        .option("fileName", {
          type: "string",
          describe: "Name of the zip file with exported data to import.",
          demandOption: "You need to provide the filename of the zip file to import.",
          alias: "f",
        })
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to import into",
          demandOption: "You need to provide the id of the Kontent.ai environment to import into.",
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
            "Only import the specified entities. (Keep in mind that some entities depend on others and may fail if their dependencies are not included.)",
          alias: "i",
          choices: importEntityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe:
            "Exclude the specified entities from the import. (Keep in mind that some entities depend on others and may fail if their dependencies are excluded.)",
          alias: "x",
          choices: importEntityChoices,
          conflicts: "include",
        }),
    handler: args => importEnvironmentCli(args).catch(simplifyErrors),
  });

type ImportEnvironmentCliParams =
  & Readonly<{
    environmentId: string;
    fileName: string;
    apiKey: string;
    include?: ReadonlyArray<ImportEntityChoices>;
    exclude?: ReadonlyArray<ImportEntityChoices>;
  }>
  & LogOptions;

const importEnvironmentCli = async (params: ImportEnvironmentCliParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName,
  });

  try {
    await importEnvironmentInternal(client, params);
  } catch (e: unknown) {
    logError(params, `${JSON.stringify(e, Object.getOwnPropertyNames(e))}\nStopping import...`);
    process.exit(1);
  }
};
