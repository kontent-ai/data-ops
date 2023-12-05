import { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { serially } from "../../../utils/requests.js";
import { EntityDefinition } from "../entityDefinition.js";

export const taxonomiesEntity: EntityDefinition<ReadonlyArray<TaxonomyContracts.ITaxonomyContract>> = {
  name: "taxonomies",
  fetchEntities: client => client.listTaxonomies().toAllPromise().then(res => res.data.items.map(t => t._raw)),
  serializeEntities: taxonomies => JSON.stringify(taxonomies),
  importEntities: async (client, fileTaxonomies) => {
    await serially(fileTaxonomies.map(taxonomy => () =>
      client
        .addTaxonomy()
        .withData(addExternalIds(taxonomy))
        .toPromise()));
  },
  deserializeEntities: JSON.parse,
};

const addExternalIds = (taxonomy: TaxonomyContracts.ITaxonomyContract): TaxonomyContracts.ITaxonomyContract => ({
  ...taxonomy,
  external_id: taxonomy.external_id ?? taxonomy.codename,
  terms: taxonomy.terms.map(addExternalIds),
});
