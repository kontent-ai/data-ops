import { existsSync } from "fs";
import { dirname } from "path";

import { logError, LogOptions } from "../../log.js";
import {
  createOutputDirectory,
  createOutputFile,
  openOutputFile,
  readHtmlFile,
  resolveOutputPath,
} from "./utils/fileUtils.js";
import { DiffData, resolveHtmlTemplate } from "./utils/htmlRenderers.js";

export const generateDiff = (diffData: DiffData) => {
  const logOptions: LogOptions = diffData;
  const resolvedPath = diffData.outPath ? resolveOutputPath(diffData.outPath) : false;
  const templateString = readHtmlFile("./diffTemplate.html", logOptions);
  const resolvedTemplate = resolveHtmlTemplate(templateString, diffData);

  if (!resolvedPath) {
    logError(logOptions, `Output path not specified.`);
    process.exit(1);
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
