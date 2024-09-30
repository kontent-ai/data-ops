import { CollectionModels, ManagementClient } from "@kontent-ai/management-sdk";

import { logInfo, LogOptions } from "../../../log.js";
import { omit } from "../../../utils/object.js";
import { DiffModel } from "../types/diffModel.js";
import { getTargetCodename, PatchOperation } from "../types/patchOperation.js";

export const syncAddAndReplaceCollections = (
  client: ManagementClient,
  collections: DiffModel["collections"],
  logOptions: LogOptions,
) => {
  if (!collections.length) {
    logInfo(logOptions, "standard", "No collections to add or update");
    return Promise.resolve();
  }

  logInfo(logOptions, "standard", "Adding and updating collections");

  return client
    .setCollections()
    .withData(collections.filter(op => op.op !== "remove").map(transformCollectionsReferences))
    .toPromise();
};

export const syncRemoveCollections = (
  client: ManagementClient,
  collections: DiffModel["collections"],
  logOptions: LogOptions,
) => {
  const collectionsRemoveOps = collections.filter(op => op.op === "remove");

  if (!collectionsRemoveOps.length) {
    logInfo(logOptions, "standard", "No collections to delete");
    return Promise.resolve();
  }

  logInfo(logOptions, "standard", "Deleting collections");

  return client
    .setCollections()
    .withData(collectionsRemoveOps.map(transformCollectionsReferences))
    .toPromise();
};

const transformCollectionsReferences = (operation: PatchOperation): CollectionModels.ISetCollectionData => {
  const pathParts = operation.path.split("/");
  const propertyName = pathParts[pathParts.length - 1];
  const codename = getTargetCodename(operation);

  return {
    ...operation.op === "replace" ? omit(operation, ["path", "oldValue"]) : omit(operation, ["path"]),
    reference: codename
      ? {
        codename: codename,
      }
      : undefined,
    property_name: operation.op === "replace" ? propertyName : undefined,
  } as unknown as CollectionModels.ISetCollectionData;
};
