import { ContentTypeSnippetContracts, ManagementClient } from "@kontent-ai/management-sdk";

import { serially } from "../../../utils/requests.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";
import { contentItemsExportEntity } from "./contentItems.js";
import { contentTypesExportEntity } from "./contentTypes.js";
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
    await serially(fileSnippets.map(createInsertSnippetFetcher({
      context,
      client,
    })));
  },
  dependentImportActions: [
    {
      dependentOnEntities: [contentItemsExportEntity, contentTypesExportEntity],
      action: async (client, fileSnippets, context) => {
        await serially(fileSnippets.map(createUpdateSnippetItemAndTypeReferencesFetcher({ client, context })));
      },
    },
  ],
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
    .toPromise();

type UpdateSnippetParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createUpdateSnippetItemAndTypeReferencesFetcher = (params: UpdateSnippetParams) => (snippet: ContentTypeSnippetContracts.IContentTypeSnippetContract) => async () =>
  params.client
    .modifyContentTypeSnippet()
    .byTypeId(snippet.id)
    .withData(snippet.elements.flatMap(createPatchItemAndTypeReferencesInTypeElement(params.context, c => c.contentTypeSnippetIdsWithElementsByOldIds.get(snippet.id)?.elementIdsByOldIds)))
    .toPromise();
