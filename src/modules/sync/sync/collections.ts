import { CollectionModels, ManagementClient } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";
import { DiffModel } from "../types/diffModel.js";
import { getTargetCodename, PatchOperation } from "../types/patchOperation.js";

export const syncAddAndReplaceCollections = (client: ManagementClient, collections: DiffModel["collections"]) => {
  if (!collections.length) {
    return Promise.resolve();
  }

  return client
    .setCollections()
    .withData(collections.filter(op => op.op !== "remove").map(transformCollectionsReferences))
    .toPromise();
};

export const syncRemoveCollections = (client: ManagementClient, collections: DiffModel["collections"]) => {
  if (!collections.length) {
    return Promise.resolve();
  }

  return client
    .setCollections()
    .withData(collections.filter(op => op.op === "remove").map(transformCollectionsReferences))
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
