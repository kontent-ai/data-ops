import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { DiffModel, DiffObject } from "./types/diffModel.js";

export const printDiff = (diffModel: DiffModel, logOptions: LogOptions) => {
  logInfo(logOptions, "standard", chalk.blue.bold("TAXONOMY GROUPS:"));
  printDiffEntity(diffModel.taxonomyGroups, "taxonomy groups", logOptions);

  logInfo(logOptions, "standard", chalk.blue.bold("\nCONTENT TYPE SNIPPETS:"));
  printDiffEntity(diffModel.contentTypeSnippets, "content type snippets", logOptions);

  logInfo(logOptions, "standard", chalk.blue.bold("\nCONTENT TYPES:"));
  printDiffEntity(diffModel.contentTypes, "content types", logOptions);
};

const printDiffEntity = (
  diffObject: DiffObject<unknown>,
  entityName: "content types" | "content type snippets" | "taxonomy groups",
  logOptions: LogOptions,
) => {
  if (diffObject.added.length) {
    logInfo(logOptions, "standard", `Added ${chalk.blue(entityName)}:`);
    diffObject.added.forEach(a => {
      logInfo(logOptions, "standard", `${chalk.green(JSON.stringify(a, null, 2))}\n`);
    });
  } else {
    logInfo(logOptions, "standard", `No ${chalk.blue(entityName)} to add.`);
  }

  if (Array.from(diffObject.updated.values()).some(o => o.length)) {
    logInfo(logOptions, "standard", `Updated ${chalk.blue(entityName)}:`);
    Array.from(diffObject.updated.entries()).sort().forEach(([codename, value]) => {
      if (value.length) {
        logInfo(logOptions, "standard", `Entity codename: ${chalk.blue(codename)}`);
        value.forEach(v => logInfo(logOptions, "standard", `${chalk.yellow(JSON.stringify(v, null, 2))}\n`));
      }
    });
  } else {
    logInfo(logOptions, "standard", `No ${chalk.blue(entityName)} to update.`);
  }

  if (diffObject.deleted.size) {
    logInfo(
      logOptions,
      "standard",
      `Deleted ${chalk.blue(entityName)} with codenames: ${chalk.red(Array.from(diffObject.deleted).join(","))}\n`,
    );
  } else {
    logInfo(logOptions, "standard", `No ${chalk.blue(entityName)} to delete.`);
  }
};
