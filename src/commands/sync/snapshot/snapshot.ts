import { type LogOptions, logError } from "../../../log.js";
import {
  type SyncEntityChoice,
  syncEntities,
  syncEntityChoices,
} from "../../../modules/sync/constants/entities.js";
import { syncSnapshotInternal } from "../../../modules/sync/syncSnapshot.js";
import type { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors } from "../../../utils/error.js";
import { createSyncEntitiesParameter } from "../utils/createSyncEntitiesParameter.js";

const commandName = "snapshot";

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "Generates content model json files used for sync from Kontent.ai environment.",
    builder: (yargs) =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "The Id of the environment to snapshot the content model from.",
          demandOption:
            "You need to provide the environmentId of the Kontent.ai to snapshot the content model from.",
          alias: "e",
        })
        .option("apiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment.",
          demandOption:
            "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("entities", {
          type: "array",
          string: true,
          choices: syncEntityChoices,
          describe: `Snapshot specified entties. Allowed entities are: ${syncEntities.join(", ")}.`,
          demandOption: "You need to provide the entities to snapshot.",
        })
        .option("folderName", {
          type: "string",
          describe: "Name of the folder to generate content model into.",
          alias: "f",
        })
        .option("kontentUrl", {
          type: "string",
          describe: 'Custom URL for Kontent.ai endpoints. Defaults to "kontent.ai".',
        }),

    handler: (args) => syncSnapshotCli(args).catch(simplifyErrors),
  });

type SyncSnapshotCliParams = Readonly<{
  environmentId: string;
  apiKey: string;
  entities: ReadonlyArray<SyncEntityChoice>;
  folderName: string | undefined;
  kontentUrl: string | undefined;
}> &
  LogOptions;

const syncSnapshotCli = async (params: SyncSnapshotCliParams) => {
  try {
    await syncSnapshotInternal(
      { ...params, entities: createSyncEntitiesParameter(params.entities) },
      createClient({
        environmentId: params.environmentId,
        apiKey: params.apiKey,
        commandName: `sync-${commandName}`,
        baseUrl: params.kontentUrl,
      }),
    );
  } catch (e) {
    logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
    process.exit(1);
  }
};
