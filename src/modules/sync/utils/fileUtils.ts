import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import open from "open";

import { type LogOptions, logError, logInfo } from "../../../log.js";

export const resolveOutputPath = (outputPath: string) => {
  const hasExtension = path.resolve(outputPath).includes(".");

  return hasExtension
    ? path.resolve(outputPath)
    : path.resolve(outputPath, `diff_${new Date().toISOString().replace(/[:.-]/g, "_")}.html`);
};

export const createOutputFile = (path: string, content: string, logOptions: LogOptions) => {
  try {
    logInfo(logOptions, "standard", chalk.yellow(`Generating a diff file at ${path}`));
    fs.writeFileSync(path, content);
  } catch (err) {
    throw new Error(
      `Failed writing a diff file: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
    );
  }
};

export const openOutputFile = (path: string, logOptions: LogOptions) => {
  logInfo(logOptions, "standard", chalk.green("Diff file created successfully. Opening..."));
  open(path).catch((err) =>
    logError(
      logOptions,
      `Failed to open the file: ${path}\nMessage: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
    ),
  );
};

export const createOutputDirectory = (path: string, logOptions: LogOptions) => {
  try {
    logInfo(logOptions, "standard", chalk.yellow(`Creating a directory '${path}'`));
    fs.mkdirSync(path, { recursive: true });
  } catch (err) {
    throw new Error(
      `Failed to create directory '${path}': ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
    );
  }
};
