import { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const taxonomiesExportEntity: EntityDefinition<ReadonlyArray<TaxonomyContracts.ITaxonomyContract>> = {
  name: "taxonomies",
  fetchEntities: client => client.listTaxonomies().toAllPromise().then(res => res.data.items.map(t => t._raw)),
  serializeEntities: taxonomies => JSON.stringify(taxonomies),
  importEntities: () => { throw new Error("Not supported yet.")},
  deserializeEntities: () => { throw new Error("Not supported yet.")},
};
