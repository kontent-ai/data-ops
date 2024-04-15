import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";

import { logError, LogOptions } from "../../log.js";
import { FileContentModel } from "./types/fileContentModel.js";
import { extractTerms } from "./utils/taxonomyGroupHelpers.js";

const contentTypeFileName = "contentTypes.json";
const snippetsFileName = "contentTypeSnippets.json";
const taxonomyGroupsFileName = "taxonomyGroups.json";

export const validateContentFolder = async (folderPath: string) => {
  const stats = await fs.stat(folderPath);

  if (!stats.isDirectory()) {
    throw new Error("The provided path is not a valid content model folder");
  }

  await fs.stat(path.resolve(folderPath, contentTypeFileName)).catch(e => {
    throw new Error(`Could not find required file ${contentTypeFileName} due to ${e}`);
  });
  await fs.stat(path.resolve(folderPath, snippetsFileName)).catch(e => {
    throw new Error(`Could not find required file ${snippetsFileName} due to ${e}`);
  });
  await fs.stat(path.resolve(folderPath, taxonomyGroupsFileName)).catch(e => {
    throw new Error(`Could not find required file ${taxonomyGroupsFileName} due to ${e}`);
  });
};

export const validateContentModel = async (
  targetModel: FileContentModel,
  environmentModel: FileContentModel,
  logOptions: LogOptions,
) => {
  // terms have different scope for externalIds than taxonomyGroups
  const targetTerms = extractTerms(targetModel.taxonomyGroups);
  const sourceTerms = extractTerms(environmentModel.taxonomyGroups);

  const errors = [
    ...handleDiffObjectsSameExtId(environmentModel.contentTypes, targetModel.contentTypes),
    ...handleDiffObjectsSameExtId(environmentModel.contentTypeSnippets, targetModel.contentTypeSnippets),
    ...handleDiffObjectsSameExtId(environmentModel.taxonomyGroups, targetModel.taxonomyGroups),
    ...handleDiffObjectsSameExtId(sourceTerms, targetTerms),
  ];

  errors.forEach(e => logError(logOptions, e));
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
