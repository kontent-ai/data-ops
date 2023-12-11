import { ContentTypeContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const contentTypesExportEntity: EntityDefinition<ReadonlyArray<ContentTypeContracts.IContentTypeContract>> = {
  name: "contentTypes",
  fetchEntities: client => client
    .listContentTypes()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw)),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: () => Promise.resolve(),
  deserializeEntities: JSON.parse,
};
