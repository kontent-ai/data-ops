import type { ManagementClient, SpaceModels } from "@kontent-ai/management-sdk";
import { P, match } from "ts-pattern";

import { type LogOptions, logInfo } from "../../../log.js";
import { throwError } from "../../../utils/error.js";
import { serially } from "../../../utils/requests.js";
import type { DiffModel } from "../types/diffModel.js";
import type { PatchOperation } from "../types/patchOperation.js";

export const syncSpaces = async (
  client: ManagementClient,
  model: DiffModel["spaces"],
  logOptions: LogOptions,
) => {
  if (model.added.length) {
    logInfo(logOptions, "standard", "Adding spaces");

    await serially(
      model.added.map(
        (space) => () =>
          client
            .addSpace()
            .withData(space as SpaceModels.IAddSpaceData)
            .toPromise(),
      ),
    );
  } else {
    logInfo(logOptions, "standard", "No spaces to add");
  }

  if ([...model.updated].flatMap(([, arr]) => arr).length) {
    logInfo(logOptions, "standard", "Updating spaces");

    await serially(
      [...model.updated].map(
        ([spaceCodename, operations]) =>
          () =>
            client
              .modifySpace()
              .bySpaceCodename(spaceCodename)
              .withData(operations.map(convertOperation))
              .toPromise(),
      ),
    );
  } else {
    logInfo(logOptions, "standard", "No spaces to update");
  }

  if (model.deleted.size) {
    logInfo(logOptions, "standard", "Deleting spaces");

    await serially(
      [...model.deleted].map(
        (spaceCodename) => () => client.deleteSpace().bySpaceCodename(spaceCodename).toPromise(),
      ),
    );
  }
  logInfo(logOptions, "standard", "No spaces to delete");
};

const convertOperation = (operation: PatchOperation): SpaceModels.IModifySpaceData =>
  match(operation)
    .with({ op: "replace" }, (op) =>
      match([op.path.split("/").pop(), op.value])
        .with(["name" as const, P.string], ([pName, value]) => ({
          op: "replace" as const,
          property_name: pName,
          value,
        }))
        .with(["web_spotlight_root_item" as const, referencePattern], ([pName, value]) => ({
          op: "replace" as const,
          property_name: pName,
          value,
        }))
        .with(["collections" as const, P.array(referencePattern)], ([pName, value]) => ({
          op: "replace" as const,
          property_name: pName,
          value,
        }))
        .otherwise(() =>
          throwError(
            `Patch operation "${JSON.stringify(op)}" has missing or invalid property name in path.`,
          ),
        ),
    )
    .with({ op: P.union("addInto", "remove", "move") }, () =>
      throwError(`Patch operation "${operation.op}" is not supported for spaces.`),
    )
    .exhaustive();

const referencePattern = {
  id: P.string.optional(),
  codename: P.string.optional(),
  external_id: P.string.optional(),
};
