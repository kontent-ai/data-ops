import { ManagementClient, TaxonomyModels } from "@kontent-ai/management-sdk";
import { oraPromise } from "ora";

import { logInfo, LogOptions } from "../../../log.js";
import { serially } from "../../../utils/requests.js";
import { noSyncTaskEmoji } from "../constants/emojiCodes.js";
import { DiffModel } from "../types/diffModel.js";
import { getTargetCodename, PatchOperation } from "../types/patchOperation.js";

export const syncTaxonomies = async (
  client: ManagementClient,
  taxonomies: DiffModel["taxonomyGroups"],
  logOptions: LogOptions,
) => {
  if (taxonomies.added.length) {
    await oraPromise(serially(taxonomies.added.map(g => () => addTaxonomyGroup(client, g))), {
      text: "Adding taxonomies",
    });
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No taxonomies to add`);
  }

  if ([...taxonomies.updated].flatMap(([, arr]) => arr).length) {
    await oraPromise(
      serially(
        Array.from(taxonomies.updated.entries()).map(([codename, operations]) => () =>
          operations.length
            ? updateTaxonomyGroup(
              client,
              codename,
              operations.map(transformTaxonomyOperations),
            )
            : Promise.resolve()
        ),
      ),
      { text: "Updating taxonomies" },
    );
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No taxonomies to update`);
  }

  if (taxonomies.deleted.size) {
    await oraPromise(serially(Array.from(taxonomies.deleted).map(c => () => deleteTaxonomyGroup(client, c))), {
      text: "Deleting taxonomies",
    });
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No taxonomies to delete`);
  }
};

const addTaxonomyGroup = (client: ManagementClient, taxonomy: TaxonomyModels.IAddTaxonomyRequestModel) =>
  client
    .addTaxonomy()
    .withData(taxonomy)
    .toPromise();

const updateTaxonomyGroup = (
  client: ManagementClient,
  codename: string,
  taxonomyData: TaxonomyModels.IModifyTaxonomyData[],
) =>
  client
    .modifyTaxonomy()
    .byTaxonomyCodename(codename)
    .withData(taxonomyData)
    .toPromise();

const deleteTaxonomyGroup = (
  client: ManagementClient,
  codename: string,
) =>
  client
    .deleteTaxonomy()
    .byTaxonomyCodename(codename)
    .toPromise();

const transformTaxonomyOperations = (
  operation: PatchOperation,
): TaxonomyModels.IModifyTaxonomyData => {
  const pathParts = operation.path.split("/");
  const propertyName = pathParts[pathParts.length - 1];
  const codename = getTargetCodename(operation);

  return {
    ...operation,
    path: undefined,
    reference: codename
      ? {
        codename: codename,
      }
      : undefined,
    property_name: operation.op === "replace" ? propertyName : undefined,
    oldValue: undefined,
  } as unknown as TaxonomyModels.IModifyTaxonomyData;
};
