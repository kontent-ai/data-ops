import { ContentItemContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const contentItemsExportEntity: EntityDefinition<ReadonlyArray<ContentItemContracts.IContentItemModelContract>> = {
  name: "contentItems",
  fetchEntities: client => client.listContentItems().toAllPromise().then(res => res.data.items.map(i => i._raw)),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: () => Promise.resolve(),
  deserializeEntities: JSON.parse,
};
