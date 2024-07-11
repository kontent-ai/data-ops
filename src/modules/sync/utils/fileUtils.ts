import chalk from "chalk";
import * as fs from "fs";
import open from "open";
import * as path from "path";

import { logError, logInfo, LogOptions } from "../../../log.js";

const { resolve } = path;
const { mkdirSync, readFileSync, writeFileSync } = fs;

export const readHtmlFile = (templatePath: string, logOptions: LogOptions): string => {
  try {
    return readFileSync(resolve(templatePath), "utf-8");
  } catch (err) {
    logError(
      logOptions,
      `Failed reading a file at '${templatePath}': ${err instanceof Error ? err.message : JSON.stringify(err)}`,
    );
    process.exit(1);
  }
};

export const resolveOutputPath = (outputPath: string) => {
  const hasExtension = resolve(outputPath).includes(".");

  return hasExtension
    ? resolve(outputPath)
    : resolve(
      outputPath,
      `diff_${new Date().toISOString().replace(/[:.-]/g, "_")}.html`,
    );
};

export const createOutputFile = (path: string, content: string, logOptions: LogOptions) => {
  try {
    logInfo(
      logOptions,
      "standard",
      chalk.yellow(`Generating a diff file at ${path}`),
    );
    writeFileSync(path, content);
  } catch (err) {
    logError(logOptions, `Failed writing a diff file: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    process.exit(1);
  }
};

export const openOutputFile = (path: string, logOptions: LogOptions) => {
  logInfo(
    logOptions,
    "standard",
    chalk.green(`Diff file created successfully. Opening...`),
  );
  open(path).catch((err) =>
    logError(
      logOptions,
      `Failed to open the file: ${path}\nMessage: ${err instanceof Error ? err.message : JSON.stringify(err)}`,
    )
  );
};

export const createOutputDirectory = (path: string, logOptions: LogOptions) => {
  try {
    logInfo(
      logOptions,
      "standard",
      chalk.yellow(`Creating a directory '${path}'`),
    );
    mkdirSync(path, { recursive: true });
  } catch (err) {
    logError(
      logOptions,
      `Failed to create directory '${path}': ${err instanceof Error ? err.message : JSON.stringify(err)}`,
    );
    process.exit(1);
  }
};
