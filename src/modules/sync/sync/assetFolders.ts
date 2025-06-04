import type { AssetFolderModels, ManagementClient } from "@kontent-ai/management-sdk";
import { match } from "ts-pattern";

import { type LogOptions, logError, logInfo } from "../../../log.js";
import { handleKontentErrors, throwError } from "../../../utils/error.js";
import { apply, not } from "../../../utils/function.js";
import { omit } from "../../../utils/object.js";
import { serially } from "../../../utils/requests.js";
import type { DiffModel } from "../types/diffModel.js";
import { type PatchOperation, getTargetCodename } from "../types/patchOperation.js";
import { isOp } from "./utils.js";

export const syncAssetFolders = async (
  client: ManagementClient,
  operations: DiffModel["assetFolders"],
  logOptions: LogOptions,
) => {
  if (!operations.length) {
    logInfo(logOptions, "standard", "No asset folders updates");
    return;
  }

  logInfo(logOptions, "standard", "Updating asset folders");

  const removeOps = operations.filter(isOp("remove"));

  await serially(
    removeOps.map(
      (operation) => () =>
        client
          .modifyAssetFolders()
          .withData([convertOperation(operation)])
          .toPromise()
          .catch(
            handleKontentErrors(
              (err) => {
                logError(
                  logOptions,
                  "error",
                  `Failed to remove asset folder "${operation.path}" error: ${JSON.stringify(err)}. Skipping it.`,
                );

                return undefined;
              },
              [5],
            ),
          ), // this is a generic code for invalid body, but the error with folder containing assets unfortunately doesn't have a specific code
    ),
  );

  const restOps = operations.filter(not(isOp("remove")));

  if (restOps.length) {
    await client.modifyAssetFolders().withData(restOps.map(convertOperation)).toPromise();
  }
};

const convertOperation = (operation: PatchOperation): AssetFolderModels.IModifyAssetFolderData => {
  const targetCodename = apply((codename) => ({ codename }), getTargetCodename(operation));

  return match(omit(operation, ["path"]))
    .returnType<AssetFolderModels.IModifyAssetFolderData>()
    .with({ op: "addInto" }, (op) => ({
      ...op,
      value: op.value as AssetFolderModels.IAssetFolderValue,
      reference: targetCodename ?? undefined,
    }))
    .with({ op: "move" }, (op) =>
      throwError(
        `Move operation is not supported for asset folders. Found operation: ${JSON.stringify(op)}`,
      ),
    )
    .with({ op: "replace" }, (op) => ({
      ...omit(op, ["oldValue"]),
      op: "rename",
      reference:
        targetCodename ?? throwError(`Missing target codename in ${JSON.stringify(operation)}`),
      value: typeof op.value === "string" ? op.value : throwError("Invalid value type"),
    }))
    .with({ op: "remove" }, (op) => ({
      ...omit(op, ["oldValue"]),
      reference:
        targetCodename ?? throwError(`Missing target codename in ${JSON.stringify(operation)}`),
    }))
    .exhaustive();
};
