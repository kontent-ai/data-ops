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

  const promiseArray = await Promise.all(
    [contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName].map(filename =>
      fs.stat(path.resolve(folderPath, filename)).catch(e => {
        return `Could not find required file ${chalk.yellow(filename)} due to ${chalk.red(e)}`;
      })
    ),
  );

  return promiseArray.filter((p): p is string => typeof p === "string");
};

export const validateContentModel = async (
  targetModel: FileContentModel,
  environmentModel: FileContentModel,
) => {
  // terms have different scope for externalIds than taxonomyGroups
  const targetTerms = extractTerms(targetModel.taxonomyGroups);
  const sourceTerms = extractTerms(environmentModel.taxonomyGroups);

  return [
    ...handleDiffObjectsSameExtId(environmentModel.contentTypes, targetModel.contentTypes),
    ...handleDiffObjectsSameExtId(environmentModel.contentTypeSnippets, targetModel.contentTypeSnippets),
    ...handleDiffObjectsSameExtId(environmentModel.taxonomyGroups, targetModel.taxonomyGroups),
    ...handleDiffObjectsSameExtId(sourceTerms, targetTerms),
  ];
};

type EntityBase = { codename: string; external_id?: string };

const handleDiffObjectsSameExtId = (
  sourceEntities: ReadonlyArray<EntityBase>,
  targetEntities: ReadonlyArray<EntityBase>,
) =>
  sourceEntities.flatMap(entity => {
    const targetEntityByExternalId = targetEntities.find(e => e.external_id === entity.external_id);

    return targetEntityByExternalId && targetEntityByExternalId.codename !== entity.codename
      ? [
        chalk.red(
          `The target project contains a type with external_id ${
            chalk.yellow(entity.external_id)
          }, however, target codename ${chalk.yellow(targetEntityByExternalId.codename)} `
            + `does not match with the codename of source object ${chalk.yellow(entity.codename)}`,
        ),
      ]
      : [];
  });
