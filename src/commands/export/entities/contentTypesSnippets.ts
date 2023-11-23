import { ContentTypeSnippetContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const contentTypesSnippetsExportEntity: EntityDefinition<ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>> = {
  name: "contentTypesSnippets",
  fetchEntities: client => client
    .listContentTypeSnippets()
    .toAllPromise()
    .then(res => res.data.items.map(s => s._raw)),
  serializeEntities: collections => JSON.stringify(collections),
};