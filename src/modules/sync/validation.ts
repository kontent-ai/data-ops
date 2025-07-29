import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { serially } from "../../utils/requests.js";
import { notNullOrUndefined } from "../../utils/typeguards.js";
import { elementTypes } from "./constants/elements.js";
import {
  contentTypeSnippetsFileName,
  contentTypesFileName,
  taxonomiesFileName,
} from "./constants/filename.js";
import type { ElementsTypes } from "./types/contractModels.js";
import type { DiffModel } from "./types/diffModel.js";
import { getTargetCodename, type PatchOperation } from "./types/patchOperation.js";

export const validateSyncModelFolder = async (folderPath: string) => {
  const stats = await fs.stat(folderPath);

  if (!stats.isDirectory()) {
    return [`The provided path ${chalk.yellow(folderPath)} is not a valid content model folder`];
  }

  const fileStatuses = await Promise.all(
    [contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName].map((filename) =>
      fs.stat(path.resolve(folderPath, filename)).catch((e) => {
        return `Could not find required file ${chalk.yellow(filename)} due to ${chalk.red(e)}`;
      }),
    ),
  );

  return fileStatuses.filter((p): p is string => typeof p === "string");
};

export const validateDiffedModel = async (client: ManagementClient, diffedModel: DiffModel) => {
  const typeUsage = await getUsedContentTypesCodenames(client, diffedModel.contentTypes.deleted);

  const typeUsageErrors = typeUsage.map(
    (typeCodename) =>
      `Content type (codename: ${typeCodename}) is being used and can't be removed (In given environment exists content items of given content type)`,
  );

  const collectionsUsage = await getUsedCollectionsCodenames(
    client,
    new Set(
      diffedModel.collections
        .filter((c) => c.op === "remove")
        .map(getTargetCodename)
        .filter(notNullOrUndefined),
    ),
  );

  const collectionsUsageErrors = collectionsUsage.map(
    (collectionCodename) =>
      `Collection (codename: ${collectionCodename}) is being used and can't be removed (In given environment exists content items of given collection)`,
  );

  const changeElementTypeOps = getElementChangeTypeOps([
    ...diffedModel.contentTypes.updated,
    ...diffedModel.contentTypeSnippets.updated,
  ]);

  const changeElementOpsErrors = changeElementTypeOps.flatMap(([entityCodename, ops]) =>
    ops.map(
      (op) =>
        `Detected unsupported operation: changing element's (codename: ${op.oldValue.codename}) 'type'(from: ${op.oldValue.type} to: ${op.value.type}) property in entity (codename: ${entityCodename})`,
    ),
  );

  return [...typeUsageErrors, ...collectionsUsageErrors, ...changeElementOpsErrors];
};

type ElementTypeCodename = Readonly<{ type: ElementsTypes; codename: string }>;
type ReplaceElementOperation = Readonly<
  Omit<Extract<PatchOperation, { op: "replace" }>, "oldValue" | "value"> & {
    oldValue: ElementTypeCodename;
    value: ElementTypeCodename;
  }
>;

const isElement = (el: unknown): el is ElementTypeCodename =>
  typeof el === "object" &&
  el !== null &&
  "type" in el &&
  typeof el.type === "string" &&
  "codename" in el &&
  typeof el.codename === "string" &&
  elementTypes.has(el.type);

const isReplaceElementOp = (op: PatchOperation): op is ReplaceElementOperation =>
  op.op === "replace" && isElement(op.oldValue) && isElement(op.value);

const getUsedContentTypesCodenames = async (
  client: ManagementClient,
  contentTypeCodenames: ReadonlySet<string>,
) => {
  const promises = [...contentTypeCodenames].map(
    (typeCodename) => () =>
      client
        .listLanguageVariantsOfContentType()
        .byTypeCodename(typeCodename)
        .toPromise()
        .then((res) => (res.data.items.length ? typeCodename : null)),
  );

  return (await serially(promises)).filter(notNullOrUndefined);
};

const getUsedCollectionsCodenames = async (
  client: ManagementClient,
  collectionCodenames: ReadonlySet<string>,
) => {
  const promises = [...collectionCodenames].map(
    (collectionCodename) => () =>
      client
        .listLanguageVariantsByCollection()
        .byCollectionCodename(collectionCodename)
        .toPromise()
        .then((res) => (res.data.items.length ? collectionCodename : null)),
  );

  return (await serially(promises)).filter(notNullOrUndefined);
};

const getElementChangeTypeOps = (
  updateOps: ReadonlyArray<[string, ReadonlyArray<PatchOperation>]>,
) =>
  updateOps
    .map(
      ([entityCodename, ops]) =>
        [
          entityCodename,
          ops.filter(isReplaceElementOp).filter((op) => op.oldValue.type !== op.value.type),
        ] as const,
    )
    .filter(([, ops]) => ops.length);
