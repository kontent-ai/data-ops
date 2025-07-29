import { match, P } from "ts-pattern";

import { type LogOptions, logError } from "../../../log.js";
import {
  type SyncEntityName,
  syncEntityChoices,
} from "../../../modules/sync/constants/entities.js";
import {
  type SyncDiffParamsInternal,
  syncDiffInternal,
} from "../../../modules/sync/diffEnvironments.js";
import { createAdvancedDiffFile, printDiff } from "../../../modules/sync/printDiff.js";
import type { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "diff";

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "Compares content models from two Kontent.ai environments.",
    builder: (yargs) =>
      yargs
        .option("targetEnvironmentId", {
          type: "string",
          describe: "Id of the target Kontent.ai environment that should be diffed.",
          demandOption: "You need to provide the environmentId of target Kontent.ai environment.",
          alias: "t",
        })
        .option("targetApiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment.",
          demandOption:
            "You need to provide a Management API key for target Kontent.ai environment.",
          alias: "tk",
        })
        .option("folderName", {
          type: "string",
          describe: "Name of the folder containing source content model.",
          alias: "f",
          conflicts: ["sourceApiKey", "sourceEnvironmentId"],
        })
        .option("sourceEnvironmentId", {
          type: "string",
          describe: "Id of Kontent.ai environment containing source content model.",
          conflicts: "folderName",
          implies: ["sourceApiKey"],
          alias: "s",
        })
        .option("sourceApiKey", {
          type: "string",
          describe: "Management API key of Kontent.ai environment containing source content model.",
          conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
          alias: "sk",
        })
        .option("advanced", {
          type: "boolean",
          describe: "Generate a detailed diff to an HTML file.",
          alias: "a",
          implies: ["outPath"],
        })
        .option("entities", {
          type: "array",
          string: true,
          choices: syncEntityChoices,
          describe: `Diff specified entities. Allowed entities are: ${syncEntityChoices.join(", ")}`,
        })
        .option("outPath", {
          type: "string",
          describe: "Path to the directory or file the diff will be generated into.",
          alias: "o",
          implies: ["advanced"],
        })
        .option("noOpen", {
          type: "boolean",
          describe: "Don't open the diff file automatically upon creation.",
          alias: "n",
          implies: ["advanced"],
        })
        .option("kontentUrl", {
          type: "string",
          describe: 'Custom URL for Kontent.ai endpoints. Defaults to "kontent.ai".',
        }),
    handler: (args) => syncDiffCli(args).catch(simplifyErrors),
  });

type syncDiffCliParams = Readonly<{
  targetEnvironmentId: string;
  targetApiKey: string;
  folderName: string | undefined;
  sourceEnvironmentId: string | undefined;
  sourceApiKey: string | undefined;
  entities: ReadonlyArray<SyncEntityName> | undefined;
  advanced: boolean | undefined;
  outPath: string | undefined;
  noOpen: boolean | undefined;
  kontentUrl: string | undefined;
}> &
  LogOptions;

const syncDiffCli = async (params: syncDiffCliParams) => {
  const resolvedParams = resolveParams(params);

  try {
    const diffModel = await syncDiffInternal(resolvedParams, commandName);

    return params.advanced
      ? createAdvancedDiffFile({ ...diffModel, ...resolvedParams })
      : printDiff(diffModel, new Set(resolvedParams.entities), params);
  } catch (e) {
    logError(params, e instanceof Error ? e.message : JSON.stringify(e));
    process.exit(1);
  }
};

const resolveParams = (params: syncDiffCliParams): SyncDiffParamsInternal => {
  const updatedParams = { ...params, entities: params.entities ?? syncEntityChoices };

  return match(updatedParams)
    .with(
      { sourceEnvironmentId: P.nonNullable, sourceApiKey: P.nonNullable },
      ({ sourceEnvironmentId, sourceApiKey }) => ({
        ...updatedParams,
        sourceEnvironmentId,
        sourceApiKey,
      }),
    )
    .with({ folderName: P.nonNullable }, ({ folderName }) => ({ ...updatedParams, folderName }))
    .otherwise(() => {
      logError(
        params,
        "You need to provide either 'folderName' or 'sourceEnvironmentId' with 'sourceApiKey' parameters",
      );
      process.exit(1);
    });
};
