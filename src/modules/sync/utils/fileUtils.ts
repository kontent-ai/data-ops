import chalk from "chalk";
import * as fs from "fs";
import open from "open";
import * as path from "path";

import { logError, logInfo, LogOptions } from "../../../log.js";

const { resolve } = path;
const { mkdirSync, readFileSync, writeFileSync } = fs;

export const readHtmlFile = (templatePath: string): string => {
  try {
    return readFileSync(resolve(templatePath), "utf-8");
  } catch (err) {
    throw new Error(
      `Failed reading a file at '${templatePath}': ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
    );
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
    throw new Error(`Failed writing a diff file: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
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
      `Failed to open the file: ${path}\nMessage: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
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
    throw new Error(
      `Failed to create directory '${path}': ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
    );
  }
};
