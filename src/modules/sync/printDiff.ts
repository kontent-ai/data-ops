import chalk from "chalk";
import { existsSync } from "fs";
import { dirname } from "path";
import { match } from "ts-pattern";

import { logInfo, LogOptions } from "../../log.js";
import { SyncEntityName } from "./constants/entities.js";
import { DiffModel, DiffObject } from "./types/diffModel.js";
import { PatchOperation } from "./types/patchOperation.js";
import { diffHtmlTemplate } from "./utils/diffTemplateHtml.js";
import { createOutputDirectory, createOutputFile, openOutputFile, resolveOutputPath } from "./utils/fileUtils.js";
import { DiffData, resolveHtmlTemplate } from "./utils/htmlRenderers.js";

export const printDiff = (
  diffModel: DiffModel,
  entities: ReadonlySet<SyncEntityName>,
  logOptions: LogOptions,
) => {
  if (entities.has("taxonomies")) {
    logInfo(logOptions, "standard", chalk.blue.bold("TAXONOMY GROUPS:"));
    printDiffEntity(diffModel.taxonomyGroups, "taxonomy groups", logOptions);
  }

  if (entities.has("contentTypeSnippets")) {
    logInfo(logOptions, "standard", chalk.blue.bold("\nCONTENT TYPE SNIPPETS:"));
    printDiffEntity(diffModel.contentTypeSnippets, "content type snippets", logOptions);
  }

  if (entities.has("contentTypes")) {
    logInfo(logOptions, "standard", chalk.blue.bold("\nCONTENT TYPES:"));
    printDiffEntity(diffModel.contentTypes, "content types", logOptions);
  }

  if (entities.has("assetFolders")) {
    logInfo(logOptions, "standard", chalk.blue.bold("\nASSET FOLDERS:"));
    if (diffModel.assetFolders.length) {
      diffModel.assetFolders.forEach(op => printPatchOperation(op, logOptions));
    } else {
      logInfo(logOptions, "standard", "No asset folders to update.");
    }
  }

  if (entities.has("collections")) {
    logInfo(logOptions, "standard", chalk.blue.bold("\nCOLLECTIONS:"));
    if (diffModel.collections.length) {
      diffModel.collections.forEach(op => printPatchOperation(op, logOptions));
    } else {
      logInfo(logOptions, "standard", "No collections to update.");
    }
  }

  if (entities.has("spaces")) {
    logInfo(logOptions, "standard", chalk.blue.bold("\nSPACES:"));
    printDiffEntity(diffModel.spaces, "spaces", logOptions);
  }

  if (entities.has("languages")) {
    logInfo(logOptions, "standard", chalk.blue.bold("\nLANGUAGES:"));
    printDiffEntity(diffModel.languages, "languages", logOptions);
  }

  if (entities.has("workflows")) {
    logInfo(logOptions, "standard", chalk.blue.bold("\nWORKFLOWS:"));
    printDiffEntity(diffModel.workflows, "workflows", logOptions);
  }

  if (entities.has("webSpotlight")) {
    if (diffModel.webSpotlight.change !== "none") {
      logInfo(logOptions, "standard", chalk.blue.bold("\nWEB SPOTLIGHT:"));

      const messsage = match(diffModel.webSpotlight)
        .with(
          { change: "activate" },
          ({ rootTypeCodename }) => `Web Spotlight is to be activated with root type: ${chalk.green(rootTypeCodename)}`,
        )
        .with(
          { change: "changeRootType" },
          ({ rootTypeCodename }) => `Web Spotlight root type is changed to: ${chalk.green(rootTypeCodename)}`,
        )
        .with({ change: "deactivate" }, () => "Web Spotlight is to be deactivated")
        .exhaustive();

      logInfo(logOptions, "standard", messsage);
    }
  }
};

const printDiffEntity = (
  diffObject: DiffObject<unknown>,
  entityName: "content types" | "content type snippets" | "taxonomy groups" | "spaces" | "languages" | "workflows",
  logOptions: LogOptions,
) => {
  if (diffObject.added.length) {
    logInfo(logOptions, "standard", `${chalk.blue(entityName)} to add:`);
    diffObject.added.forEach(a => {
      logInfo(logOptions, "standard", `${chalk.green(JSON.stringify(a, null, 2))}\n`);
    });
  } else {
    logInfo(logOptions, "standard", `No ${chalk.blue(entityName)} to add.`);
  }

  if (Array.from(diffObject.updated.values()).some(o => o.length)) {
    logInfo(logOptions, "standard", `${chalk.blue(entityName)} to update:`);
    Array.from(diffObject.updated.entries()).sort().forEach(([codename, value]) => {
      if (value.length) {
        logInfo(logOptions, "standard", `Entity codename: ${chalk.blue(codename)}`);
        value.forEach(v => printPatchOperation(v, logOptions));
      }
    });
  } else {
    logInfo(logOptions, "standard", `No ${chalk.blue(entityName)} to update.`);
  }

  if (diffObject.deleted.size) {
    logInfo(
      logOptions,
      "standard",
      `${chalk.blue(entityName)} to delete with codenames: ${chalk.red(Array.from(diffObject.deleted).join(","))}\n`,
    );
  } else {
    logInfo(logOptions, "standard", `No ${chalk.blue(entityName)} to delete.`);
  }
};

export const createAdvancedDiffFile = (diffData: DiffData) => {
  const logOptions: LogOptions = diffData;
  const resolvedPath = diffData.outPath ? resolveOutputPath(diffData.outPath) : false;
  const resolvedTemplate = resolveHtmlTemplate(diffHtmlTemplate, diffData);

  if (!resolvedPath) {
    throw new Error(`Output path not specified.`);
  }

  const outputDir = dirname(resolvedPath);

  if (!existsSync(outputDir)) {
    createOutputDirectory(outputDir, logOptions);
  }

  createOutputFile(resolvedPath, resolvedTemplate, logOptions);

  if (!diffData.noOpen) {
    openOutputFile(resolvedPath, logOptions);
  }
};

const printPatchOperation = (operation: PatchOperation, logOptions: LogOptions) =>
  logInfo(logOptions, "standard", `${chalk.yellow(JSON.stringify(operation, null, 2))}\n`);
