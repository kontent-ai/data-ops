import type { ManagementClient } from "@kontent-ai/management-sdk";

import type { LogOptions } from "../../log.js";
import type { SyncEntityName } from "./constants/entities.js";
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
import {
  addTypesWithoutReferences,
  deleteContentTypes,
  updateContentTypesAndAddReferences,
} from "./sync/types.js";
import { isOp } from "./sync/utils.js";
import { updateWebSpotlight } from "./sync/webSpotlight.js";
import { syncWorkflows } from "./sync/workflows.js";
import type { DiffModel } from "./types/diffModel.js";

export const sync = async (
  client: ManagementClient,
  diff: DiffModel,
  entities: ReadonlySet<SyncEntityName>,
  logOptions: LogOptions,
) => {
  // the order of these operations is very important
  if (entities.has("assetFolders")) {
    await syncAssetFolders(client, diff.assetFolders, logOptions);
  }

  if (entities.has("collections")) {
    await syncAddAndReplaceCollections(client, diff.collections, logOptions);
  }

  if (entities.has("spaces")) {
    await syncSpaces(client, diff.spaces, logOptions);
  }

  if (entities.has("collections")) {
    await syncRemoveCollections(client, diff.collections, logOptions);
  }

  if (entities.has("languages")) {
    await syncLanguages(client, diff.languages, logOptions);
  }

  if (entities.has("taxonomies")) {
    await syncTaxonomies(client, diff.taxonomyGroups, logOptions);
  }

  if (entities.has("contentTypeSnippets")) {
    await addSnippetsWithoutReferences(client, diff.contentTypeSnippets.added, logOptions);
  }

  const updateSnippetAddIntoOps = [...diff.contentTypeSnippets.updated].map(
    ([c, ops]) => [c, ops.filter(isOp("addInto"))] as const,
  );

  if (entities.has("contentTypeSnippets")) {
    await addElementsIntoSnippetsWithoutReferences(client, updateSnippetAddIntoOps, logOptions);
  }

  if (entities.has("contentTypes")) {
    await addTypesWithoutReferences(client, diff.contentTypes.added, logOptions);
  }

  if (entities.has("contentTypeSnippets")) {
    await addSnippetsReferences(
      client,
      updateSnippetAddIntoOps,
      diff.contentTypeSnippets.added,
      logOptions,
    );
  }

  if (entities.has("contentTypes")) {
    await updateContentTypesAndAddReferences(client, diff.contentTypes, logOptions);
  }

  if (entities.has("workflows")) {
    await syncWorkflows(client, diff.workflows, logOptions);
  }

  // uses a created/updated type when enabling and disables before deleting the root type
  if (entities.has("webSpotlight")) {
    await updateWebSpotlight(client, diff.webSpotlight, logOptions);
  }

  if (entities.has("contentTypes")) {
    await deleteContentTypes(client, diff.contentTypes, logOptions);
  }

  if (entities.has("contentTypeSnippets")) {
    await deleteContentTypeSnippets(client, diff.contentTypeSnippets, logOptions);
  }

  // replace, remove, move operations
  if (entities.has("contentTypeSnippets")) {
    await updateSnippets(client, diff.contentTypeSnippets.updated, logOptions);
  }
};
