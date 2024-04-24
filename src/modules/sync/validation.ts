import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";

import { contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName } from "./constants/filename.js";
import { FileContentModel } from "./types/fileContentModel.js";
import { extractTerms } from "./utils/taxonomyGroupHelpers.js";

export const validateContentFolder = async (folderPath: string) => {
  const stats = await fs.stat(folderPath);

  if (!stats.isDirectory()) {
    return [`The provided path ${chalk.yellow(folderPath)} is not a valid content model folder`];
  }

  const fileStatuses = await Promise.all(
    [contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName].map(filename =>
      fs.stat(path.resolve(folderPath, filename)).catch(e => {
        return `Could not find required file ${chalk.yellow(filename)} due to ${chalk.red(e)}`;
      })
    ),
  );

  return fileStatuses.filter((p): p is string => typeof p === "string");
};

export const validateContentModel = async (
  targetModel: FileContentModel,
  sourceModel: FileContentModel,
) => {
  // terms have different scope for externalIds than taxonomyGroups
  const targetTerms = targetModel.taxonomyGroups.flatMap(extractTerms);
  const sourceTerms = sourceModel.taxonomyGroups.flatMap(extractTerms);

  return [
    ...handleDiffObjectsSameExtId(sourceModel.contentTypes, targetModel.contentTypes, "type"),
    ...handleDiffObjectsSameExtId(sourceModel.contentTypeSnippets, targetModel.contentTypeSnippets, "snippet"),
    ...handleDiffObjectsSameExtId(sourceModel.taxonomyGroups, targetModel.taxonomyGroups, "taxonomy group"),
    ...handleDiffObjectsSameExtId(sourceTerms, targetTerms, "term"),
  ];
};

type EntityBase = Readonly<{ codename: string; external_id?: string }>;

const handleDiffObjectsSameExtId = (
  sourceEntities: ReadonlyArray<EntityBase>,
  targetEntities: ReadonlyArray<EntityBase>,
  entityType: "type" | "snippet" | "taxonomy group" | "term",
) =>
  sourceEntities
    .filter(e => e.external_id)
    .flatMap(entity => {
      const targetEntityByExternalId = targetEntities.find(e => e.external_id === entity.external_id);

      return targetEntityByExternalId && targetEntityByExternalId.codename !== entity.codename
        ? [
          chalk.red(
            `The target project contains a ${entityType} with external_id ${
              chalk.yellow(entity.external_id)
            }, however, target codename ${chalk.yellow(targetEntityByExternalId.codename)} `
              + `does not match with the codename of source object ${chalk.yellow(entity.codename)}`,
          ),
        ]
        : [];
    });
