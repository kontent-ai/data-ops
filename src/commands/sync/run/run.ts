import { match, P } from "ts-pattern";

import { logError, LogOptions } from "../../../log.js";
import { syncEntityChoices, SyncEntityName } from "../../../modules/sync/constants/entities.js";
import { printDiff } from "../../../modules/sync/printDiff.js";
import { SyncEntities, syncRunInternal, SyncRunParams } from "../../../modules/sync/syncRun.js";
import { checkConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "run";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Synchronize content model between two Kontent.ai environments.",
    builder: yargs =>
      yargs
        .option("targetEnvironmentId", {
          type: "string",
          describe: "Id of the target Kontent.ai environment.",
          demandOption: "You need to provide the environmentId for target Kontent.ai environment.",
          alias: "t",
        })
        .option("targetApiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment.",
          demandOption: "You need to provide a Management API key for target Kontent.ai environment.",
          alias: "tk",
        })
        .option("folderName", {
          type: "string",
          describe:
            "Name of the folder containing source content model. Can't be used with --sourceEnvironmentId and --sourceApiKey options.",
          alias: "f",
          conflicts: ["sourceApiKey", "sourceEnvironmentId"],
        })
        .option("sourceEnvironmentId", {
          type: "string",
          describe:
            "Id of Kontent.ai environment containing source content model. Must be used with --sourceApiKey. Can't be used at the same time with option --folderName.",
          conflicts: "folderName",
          implies: ["sourceApiKey"],
          alias: "s",
        })
        .option("sourceApiKey", {
          type: "string",
          describe:
            "Management API key of Kontent.ai environment containing source content model. Must be used with --sourceEnvironmentId. Can't be used at the same time with option --folderName.",
          conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
          alias: "sk",
        })
        .option("entities", {
          alias: "e",
          type: "array",
          choices: syncEntityChoices,
          describe: `Sync specified entties. Allowed entities are: ${syncEntityChoices.join(", ")}.`,
          demandOption: "You need to provide the what entities to sync.",
          conflicts: "exclude",
        })
        .option("skipConfirmation", {
          type: "boolean",
          describe: "Skip confirmation message.",
        })
        .option("kontentUrl", {
          type: "string",
          describe: "Custom URL for Kontent.ai endpoints. Defaults to \"kontent.ai\".",
        }),
    handler: args => syncRunCli(args).catch(simplifyErrors),
  });

type SyncModelRunCliParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    entities: ReadonlyArray<SyncEntityName>;
    folderName: string | undefined;
    sourceEnvironmentId: string | undefined;
    sourceApiKey: string | undefined;
    skipConfirmation: boolean | undefined;
    kontentUrl: string | undefined;
  }>
  & LogOptions;

const syncRunCli = async (params: SyncModelRunCliParams) => {
  const resolvedParams = resolveParams(params);

  try {
    await syncRunInternal(resolvedParams, `sync-${commandName}`, async (diffModel) => {
      printDiff(diffModel, new Set(params.entities), params);

      await checkConfirmation({
        message:
          `⚠ Running this operation may result in irreversible changes to the content in environment ${params.targetEnvironmentId}. Mentioned changes might include:
- Removing content due to element deletion
OK to proceed y/n? (suppress this message with --sw parameter)\n`,
        skipConfirmation: params.skipConfirmation,
        logOptions: params,
      });
    });
  } catch (e) {
    logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
    process.exit(1);
  }
};

const resolveParams = (params: SyncModelRunCliParams): SyncRunParams => {
  const entities = createSyncEntitiesParameter(params.entities);

  const x = match(params)
    .with(
      { sourceEnvironmentId: P.nonNullable, sourceApiKey: P.nonNullable },
      ({ sourceEnvironmentId, sourceApiKey }) => ({ ...params, sourceEnvironmentId, sourceApiKey }),
    )
    .with({ folderName: P.nonNullable }, ({ folderName }) => ({ ...params, folderName }))
    .otherwise(() => {
      logError(
        params,
        "You need to provide either 'folderName' or 'sourceEnvironmentId' with 'sourceApiKey' parameters.",
      );
      process.exit(1);
    });

  return { ...x, entities };
};

const createSyncEntitiesParameter = (
  entities: ReadonlyArray<SyncEntityName>,
): SyncEntities => {
  const filterEntries = [
    ...entities.filter(a => a !== "webSpotlight").map(e => [e, () => true]),
    ...entities.includes("webSpotlight") ? [["webSpotlight", true]] : [],
  ] as const;

  return Object.fromEntries(filterEntries);
};
