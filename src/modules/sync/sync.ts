import { ManagementClient } from "@kontent-ai/management-sdk";

import { LogOptions } from "../../log.js";
import { syncAssetFolders } from "./sync/assetFolders.js";
import { syncAddAndReplaceCollections, syncRemoveCollections } from "./sync/collections.js";
import { syncLanguages } from "./sync/languages.js";
import {
  addElementsIntoSnippetsWithoutReferences,
  addSnippetsReferences,
  addSnippetsWithoutReferences,
  deleteContentTypeSnippets,
  updateSnippets,
} from "./sync/snippets.js";
import { syncSpaces } from "./sync/spaces.js";
import { syncTaxonomies } from "./sync/taxonomy.js";
import { addTypesWithoutReferences, deleteContentTypes, updateContentTypesAndAddReferences } from "./sync/types.js";
import { isOp } from "./sync/utils.js";
import { updateWebSpotlight } from "./sync/webSpotlight.js";
import { syncWorkflows } from "./sync/workflows.js";
import { SyncEntities } from "./syncModelRun.js";
import { DiffModel } from "./types/diffModel.js";

export const sync = async (
  client: ManagementClient,
  diff: DiffModel,
  entities: ReadonlySet<SyncEntityName>,
  logOptions: LogOptions,
) => {
  // the order of these operations is very important
  await syncAssetFolders(client, diff.assetFolders, logOptions);

  await syncAddAndReplaceCollections(client, diff.collections, logOptions);

  await syncSpaces(client, diff.spaces, logOptions);

  await syncRemoveCollections(client, diff.collections, logOptions);

  await syncLanguages(client, diff.languages, logOptions);

  await syncTaxonomies(client, diff.taxonomyGroups, logOptions);

  await addSnippetsWithoutReferences(client, diff.contentTypeSnippets.added, logOptions);

  const updateSnippetAddIntoOps = [...diff.contentTypeSnippets.updated]
    .map(([c, ops]) => [c, ops.filter(isOp("addInto"))] as const);

  await addElementsIntoSnippetsWithoutReferences(client, updateSnippetAddIntoOps, logOptions);

  await addTypesWithoutReferences(client, diff.contentTypes.added, logOptions);

  await addSnippetsReferences(client, updateSnippetAddIntoOps, diff.contentTypeSnippets.added, logOptions);

  await updateContentTypesAndAddReferences(client, diff.contentTypes, logOptions);

  await syncWorkflows(client, diff.workflows, logOptions);

  // uses a created/updated type when enabling and disables before deleting the root type
  await updateWebSpotlight(client, diff.webSpotlight, logOptions);

  await deleteContentTypes(client, diff.contentTypes, logOptions);

  await deleteContentTypeSnippets(client, diff.contentTypeSnippets, logOptions);

  // replace, remove, move operations
  await updateSnippets(client, diff.contentTypeSnippets.updated, logOptions);
};
