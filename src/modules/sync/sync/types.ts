import type { ContentTypeModels, ManagementClient } from "@kontent-ai/management-sdk";

import { type LogOptions, logInfo } from "../../../log.js";
import { omit } from "../../../utils/object.js";
import { serially } from "../../../utils/requests.js";
import type { DiffModel } from "../types/diffModel.js";
import { createUpdateReferencesOps, removeReferencesFromAddOp } from "./utils.js";

export const addTypesWithoutReferences = async (
  client: ManagementClient,
  addContentTypes: DiffModel["contentTypes"]["added"],
  logOptions: LogOptions,
) => {
  const addTypesWithoutReferences = addContentTypes.map(removeReferencesFromAddOp);

  if (!addTypesWithoutReferences.length) {
    logInfo(logOptions, "standard", "No content types to add");
    return;
  }

  logInfo(logOptions, "standard", "Adding content types");
  await serially(addTypesWithoutReferences.map((t) => () => addContentType(client, t)));
};

export const updateContentTypesAndAddReferences = async (
  client: ManagementClient,
  typeOps: DiffModel["contentTypes"],
  logOptions: LogOptions,
) => {
  const typesReplaceReferencesOps = typeOps.added.map(createUpdateReferencesOps);

  if (!(typesReplaceReferencesOps.length || typeOps.updated.size)) {
    logInfo(logOptions, "standard", "No content types to update");
    return;
  }

  logInfo(logOptions, "standard", "Updating content types and adding their references");
  await serially(
    [...typeOps.updated.entries(), ...typesReplaceReferencesOps].map(
      ([codename, operations]) =>
        () =>
          operations.length
            ? updateContentType(
                client,
                codename,
                operations.map((o) =>
                  o.op === "replace" || o.op === "remove"
                    ? omit(o, ["oldValue"])
                    : (o as unknown as ContentTypeModels.IModifyContentTypeData),
                ),
              )
            : Promise.resolve(),
    ),
  );
};

export const deleteContentTypes = async (
  client: ManagementClient,
  typeOps: DiffModel["contentTypes"],
  logOptions: LogOptions,
) => {
  if (typeOps.deleted.size) {
    logInfo(logOptions, "standard", "Deleting content types");
    await serially(Array.from(typeOps.deleted).map((c) => () => deleteContentType(client, c)));
  } else {
    logInfo(logOptions, "standard", "No content types to delete");
  }
};

const addContentType = (client: ManagementClient, type: ContentTypeModels.IAddContentTypeData) =>
  client
    .addContentType()
    .withData(() => type)
    .toPromise();

const updateContentType = (
  client: ManagementClient,
  codename: string,
  typeData: ContentTypeModels.IModifyContentTypeData[],
) => client.modifyContentType().byTypeCodename(codename).withData(typeData).toPromise();

const deleteContentType = (client: ManagementClient, codename: string) =>
  client.deleteContentType().byTypeCodename(codename).toPromise();
