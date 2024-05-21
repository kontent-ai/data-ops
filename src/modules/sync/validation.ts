import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";

import { serially } from "../../utils/requests.js";
import { notNullOrUndefined } from "../../utils/typeguards.js";
import { elementTypes } from "./constants/elements.js";
import { contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName } from "./constants/filename.js";
import { ElementsTypes } from "./types/contractModels.js";
import { DiffModel, PatchOperation } from "./types/diffModel.js";
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

export const validateDiffedModel = async (
  client: ManagementClient,
  diffedModel: DiffModel,
) => {
  const typeUsage = await getUsedContentTypesCodenames(client, diffedModel.contentTypes.deleted);

  const typeUsageErrors = typeUsage.map((typeCodename) =>
    `Content type (codename: ${typeCodename}) is being used and can't be removed (In given environment exists content items of given content type)`
  );

  const changeElementTypeOps = getElementChangeTypeOps([
    ...diffedModel.contentTypes.updated,
    ...diffedModel.contentTypeSnippets.updated,
  ]);

  const changeElementOpsErrors = changeElementTypeOps.flatMap(([entityCodename, ops]) =>
    ops.map(op =>
      `Detected unsupported operation: changing element's (codename: ${op.oldValue.codename}) 'type'(from: ${op.oldValue.type} to: ${op.value.type}) property in entity (codename: ${entityCodename})`
    )
  );

  return [...typeUsageErrors, ...changeElementOpsErrors];
};

type ElementTypeCodename = Readonly<{ type: ElementsTypes; codename: string }>;
type ReplaceElementOperation = Readonly<
  Omit<Extract<PatchOperation, { op: "replace" }>, "oldValue" | "value"> & {
    oldValue: ElementTypeCodename;
    value: ElementTypeCodename;
  }
>;

const isElement = (el: unknown): el is ElementTypeCodename =>
  typeof el === "object"
  && el !== null
  && "type" in el
  && typeof el.type === "string"
  && "codename" in el
  && typeof (el.codename) === "string"
  && elementTypes.has(el.type);

const isReplaceElementOp = (
  op: PatchOperation,
): op is ReplaceElementOperation => op.op === "replace" && isElement(op.oldValue) && isElement(op.value);

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

const getUsedContentTypesCodenames = async (client: ManagementClient, contentTypeCodenames: ReadonlySet<string>) => {
  const promises = [...contentTypeCodenames].map(typeCodename => () =>
    client
      .listLanguageVariantsOfContentType()
      .byTypeCodename(typeCodename)
      .toPromise()
      .then(res => res.data.items.length ? typeCodename : null)
  );

  return (await serially(promises))
    .filter(notNullOrUndefined);
};

const getElementChangeTypeOps = (
  updateOps: ReadonlyArray<[string, ReadonlyArray<PatchOperation>]>,
) =>
  updateOps
    .map(([entityCodename, ops]) =>
      [
        entityCodename,
        ops.filter(isReplaceElementOp)
          .filter(op => op.oldValue.type !== op.value.type),
      ] as const
    )
    .filter(([, ops]) => ops.length);
