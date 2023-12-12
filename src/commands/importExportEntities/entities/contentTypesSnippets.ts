import { ContentTypeSnippetContracts, ManagementClient } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { EntityDefinition, EntityImportDefinition, ImportContext } from "../entityDefinition.js";
import { createPatchItemAndTypeReferencesInTypeElement, createTransformTypeElement } from "./utils/typeElements.js";

export const contentTypesSnippetsEntity: EntityDefinition<ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>> = {
  name: "contentTypesSnippets",
  fetchEntities: client => client
    .listContentTypeSnippets()
    .toAllPromise()
    .then(res => res.data.items.map(s => s._raw)),
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileSnippets, context) => {
    const projectSnippets = await serially(fileSnippets.map(createInsertSnippetFetcher({ context, client })));

    return {
      ...context,
      contentTypeSnippetIdsWithElementsByOldIds: new Map(
        zip(fileSnippets, projectSnippets)
          .map(([fileSnippet, projectSnippet]) => {
            const elementIdEntries = zip(fileSnippet.elements, projectSnippet.elements)
              .map(([fileEl, projectEl]) => [fileEl.id ?? "", projectEl.id ?? ""] as const);

            return [fileSnippet.id, { selfId: projectSnippet.id, elementIdsByOldIds: new Map(elementIdEntries) }];
          })
      ),
    };
  },
};

export const updateItemAndTypeReferencesInSnippetsImportEntity: EntityImportDefinition<ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>> = {
  name: "contentTypesSnippets",
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileSnippets, context) => {
    await serially(fileSnippets.map(createUpdateSnippetItemAndTypeReferencesFetcher({ client, context })));
  },
};

type InsertSnippetParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createInsertSnippetFetcher = (params: InsertSnippetParams) => (snippet: ContentTypeSnippetContracts.IContentTypeSnippetContract) => async () => 
  params.client
    .addContentTypeSnippet()
    .withData(builder => ({
      name: snippet.name,
      codename: snippet.codename,
      external_id: snippet.external_id ?? snippet.codename,
      elements: snippet.elements.map(createTransformTypeElement({
        ...params,
        builder,
        typeOrSnippetCodename: snippet.codename,
        elementExternalIdsByOldId: new Map(snippet.elements.map(el => [el.id ?? "", el.external_id ?? `${snippet.codename}_${el.codename}`])),
        contentGroupExternalIdByOldId: new Map(),
      })),
    }))
    .toPromise()
    .then(res => res.rawData);

type UpdateSnippetParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createUpdateSnippetItemAndTypeReferencesFetcher = (params: UpdateSnippetParams) => (snippet: ContentTypeSnippetContracts.IContentTypeSnippetContract) => () => {
  const patchOps = snippet.elements
    .flatMap(createPatchItemAndTypeReferencesInTypeElement(params.context, c => c.contentTypeSnippetIdsWithElementsByOldIds.get(snippet.id)?.elementIdsByOldIds))

  if (!patchOps.length) {
    return Promise.resolve();
  }

  return params.client
    .modifyContentTypeSnippet()
    .byTypeId(params.context.contentTypeSnippetIdsWithElementsByOldIds.get(snippet.id)?.selfId ?? "")
    .withData(patchOps)
    .toPromise();
};
