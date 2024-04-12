import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logError, LogOptions } from "../../log.js";
import { FileContentModel } from "./types/fileContentModel.js";

export const validateContentModel = async (
  client: ManagementClient,
  environmentModel: FileContentModel,
  logOptions: LogOptions,
) => {
  const targetTypes = await client.listContentTypes().toAllPromise().then(res =>
    res.data.items.flatMap(type => type._raw)
  );
  const targetSnippets = await client.listContentTypeSnippets().toAllPromise().then(res =>
    res.data.items.flatMap(snippet => snippet._raw)
  );

  const errors = [
    ...environmentModel.contentTypes.reduce<string[]>(
      (prev, current) => [...prev, ...handleObject(current, targetTypes)],
      [],
    ),
    ...environmentModel.contentTypeSnippets.reduce<string[]>(
      (prev, current) => [...prev, ...handleObject(current, targetSnippets)],
      [],
    ),
  ];

  errors.forEach(e => logError(logOptions, e));
};

const handleObject = (
  sourceEntity: { codename: string; external_id?: string },
  targetEntities: { codename: string; external_id?: string }[],
) => {
  const targetEntityByExternalId = targetEntities.find(e => e.external_id === sourceEntity.external_id);

  return targetEntityByExternalId && targetEntityByExternalId.codename !== sourceEntity.codename
    ? [
      chalk.red(`The target project contains a type with external_id ${
        chalk.yellow(sourceEntity.external_id)
      }, however, target codename ${chalk.yellow(targetEntityByExternalId.codename)} `
      + `does not match with the codename of source object ${chalk.yellow(sourceEntity.codename)}`),
    ]
    : [];
};
