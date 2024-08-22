import { ManagementClient } from "@kontent-ai/management-sdk";

import { logInfo, LogOptions } from "../../log.js";
import { serially } from "../../utils/requests.js";
import { syncAssetFolders } from "./sync/assetFolders.js";
import {
  addElementsIntoSnippetsWithoutReferences,
  addSnippetsReferences,
  addSnippetsWithoutReferences,
  deleteSnippet,
  updateSnippets,
} from "./sync/snippets.js";
import { syncTaxonomies } from "./sync/taxonomy.js";
import { addTypesWithoutReferences, deleteContentType, updateContentTypesAndAddReferences } from "./sync/types.js";
import { isOp } from "./sync/utils.js";
import { updateWebSpotlight } from "./sync/webSpotlight.js";
import { DiffModel } from "./types/diffModel.js";

export const sync = async (client: ManagementClient, diff: DiffModel, logOptions: LogOptions) => {
  // there order of these operations is very important
  await syncAssetFolders(client, diff.assetFolders, logOptions);

  await syncTaxonomies(client, diff.taxonomyGroups, logOptions);

  logInfo(logOptions, "standard", "Adding content type snippets");
  await addSnippetsWithoutReferences(client, diff.contentTypeSnippets.added);

  const updateSnippetAddIntoOps = [...diff.contentTypeSnippets.updated]
    .map(([c, ops]) => [c, ops.filter(isOp("addInto"))] as const);

  logInfo(logOptions, "standard", "Adding elements into content type snippets");
  await addElementsIntoSnippetsWithoutReferences(client, updateSnippetAddIntoOps);

  logInfo(logOptions, "standard", "Adding content types");
  await addTypesWithoutReferences(client, diff.contentTypes.added);

  logInfo(logOptions, "standard", "Updating content type snippet's references");
  await addSnippetsReferences(client, updateSnippetAddIntoOps, diff.contentTypeSnippets.added);

  logInfo(logOptions, "standard", "Updating content types and adding their references");
  await updateContentTypesAndAddReferences(client, diff.contentTypes);

  // uses a created/updated type when enabling and disables before deleting the root type
  logInfo(logOptions, "standard", "Updating web spotlight");
  await updateWebSpotlight(client, diff.webSpotlight);

  logInfo(logOptions, "standard", "Removing content types");
  await serially(Array.from(diff.contentTypes.deleted).map(c => () => deleteContentType(client, c)));

  logInfo(logOptions, "standard", "Removing content type snippets");
  await serially(Array.from(diff.contentTypeSnippets.deleted).map(c => () => deleteSnippet(client, c)));

  // replace, remove, move operations
  logInfo(logOptions, "standard", "Updating content type snippets");
  await updateSnippets(client, diff.contentTypeSnippets.updated);
};
