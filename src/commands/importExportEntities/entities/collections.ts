import { CollectionContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const collectionsExportEntity: EntityDefinition<ReadonlyArray<CollectionContracts.ICollectionContract>> = {
  name: "collections",
  fetchEntities: client => client.listCollections().toPromise().then(res => res.rawData.collections),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: () => { throw new Error("Not supported yet.")},
  deserializeEntities: () => { throw new Error("Not supported yet.")},
};
