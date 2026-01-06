import * as fsPromises from "node:fs/promises";
import * as path from "node:path";

import { type LogOptions, logInfo } from "../../../log.js";
import type { MarkdownResult } from "./fetchItemsToMarkdown.js";

export type WriteMarkdownsParams = Readonly<{
  results: ReadonlyArray<MarkdownResult>;
  outputPath?: string;
}> &
  LogOptions;

export type WriteMarkdownsResult = Readonly<{
  outputPath: string;
  itemCount: number;
}>;

export const writeMarkdowns = async (
  params: WriteMarkdownsParams,
): Promise<WriteMarkdownsResult> => {
  const outputPath = resolveOutputPath(params.outputPath);

  await ensureOutputDirectory(outputPath);
  await writeMarkdownFiles(params.results, outputPath, params);

  return { outputPath, itemCount: params.results.length };
};

const resolveOutputPath = (outputPath: string | undefined): string => {
  if (!outputPath) {
    return process.cwd();
  }

  return path.isAbsolute(outputPath) ? outputPath : path.join(process.cwd(), outputPath);
};

const ensureOutputDirectory = async (dirPath: string): Promise<void> => {
  await fsPromises.mkdir(dirPath, { recursive: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "EEXIST") {
      throw new Error(`Path "${dirPath}" exists but is not a directory`);
    }
    throw error;
  });
};

const writeMarkdownFiles = async (
  results: ReadonlyArray<MarkdownResult>,
  outputPath: string,
  params: LogOptions,
): Promise<void> => {
  for (const { codename, markdown } of results) {
    await fsPromises.writeFile(path.join(outputPath, `${codename}.md`), markdown);
    logInfo(params, "verbose", `Wrote ${codename}.md`);
  }
};
