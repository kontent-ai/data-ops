import { ContentTypeModels, ManagementClient } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";
import { serially } from "../../../utils/requests.js";
import { DiffModel } from "../types/diffModel.js";
import { createUpdateReferencesOps, removeReferencesFromAddOp } from "./utils.js";

export const addTypesWithoutReferences = async (
  client: ManagementClient,
  addContentTypes: DiffModel["contentTypes"]["added"],
) => {
  const addTypesWithoutReferences = addContentTypes.map(removeReferencesFromAddOp);
  await serially(addTypesWithoutReferences.map(t => () => addContentType(client, t)));
};

export const updateContentTypesAndAddReferences = async (
  client: ManagementClient,
  typeOps: DiffModel["contentTypes"],
) => {
  const typesReplaceReferencesOps = typeOps.added.map(createUpdateReferencesOps);

  await serially(
    [...typeOps.updated.entries(), ...typesReplaceReferencesOps].map(([codename, operations]) => () =>
      operations.length
        ? updateContentType(
          client,
          codename,
          operations.map(o =>
            o.op === "replace" || o.op === "remove"
              ? omit(o, ["oldValue"])
              : o as unknown as ContentTypeModels.IModifyContentTypeData
          ),
        )
        : Promise.resolve()
    ),
  );
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
) =>
  client
    .modifyContentType()
    .byTypeCodename(codename)
    .withData(typeData)
    .toPromise();

export const deleteContentType = (
  client: ManagementClient,
  codename: string,
) =>
  client
    .deleteContentType()
    .byTypeCodename(codename)
    .toPromise();
