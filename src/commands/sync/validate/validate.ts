import { type LogOptions, logError, logInfo } from "../../../log.js";
import {
  type SyncEntityName,
  syncEntityChoices,
} from "../../../modules/sync/constants/entities.js";
import { parseContentModelFromFolder } from "../../../modules/sync/utils/getContentModel.js";
import { validateSyncModelFolder } from "../../../modules/sync/validation.js";
import type { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "validate";

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "Validate the contents of a sync folder against the expected schema.",
    builder: (yargs) =>
      yargs
        .option("folderName", {
          type: "string",
          describe: "Path to the folder containing the content model to validate.",
          demandOption: "You need to provide the path to the content model folder.",
          alias: "f",
        })
        .option("entities", {
          type: "array",
          string: true,
          choices: syncEntityChoices,
          describe: `Validate specified entities. Allowed entities are: ${syncEntityChoices.join(", ")}.`,
          alias: "e",
        }),
    handler: (args) => syncValidateCli(args).catch(simplifyErrors),
  });

type SyncValidateCliParams = Readonly<{
  folderName: string;
  entities: ReadonlyArray<SyncEntityName> | undefined;
}> &
  LogOptions;

const syncValidateCli = async (params: SyncValidateCliParams) => {
  const entities = params.entities ?? [...syncEntityChoices];

  const folderErrors = await validateSyncModelFolder(params.folderName, entities);

  if (folderErrors.length) {
    folderErrors.forEach((error) => logError(params, error));
    process.exit(1);
  }

  const result = await parseContentModelFromFolder(params.folderName);

  if (!result.success) {
    result.errors.forEach((error) => logError(params, error.message));
    process.exit(1);
  }

  logInfo(params, "standard", "All files are valid.\n");
};
