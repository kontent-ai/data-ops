import { TaxonomyContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo } from "../../../../log.js";
import { zip } from "../../../../utils/array.js";
import { serially } from "../../../../utils/requests.js";
import { EntityDefinition } from "../entityDefinition.js";

export const taxonomiesEntity: EntityDefinition<ReadonlyArray<TaxonomyContracts.ITaxonomyContract>> = {
  name: "taxonomies",
  displayName: "taxonomies",
  fetchEntities: client => client.listTaxonomies().toAllPromise().then(res => res.data.items.map(t => t._raw)),
  serializeEntities: taxonomies => JSON.stringify(taxonomies),
  importEntities: async (client, fileTaxonomies, context, logOptions) => {
    const projectTaxonomies = await serially<ReadonlyArray<() => Promise<TaxonomyContracts.ITaxonomyContract>>>(
      fileTaxonomies.map(taxonomy => () => {
        logInfo(logOptions, "verbose", `Importing: taxonomy group ${taxonomy.id} (${chalk.yellow(taxonomy.name)})`);

        return client
          .addTaxonomy()
          .withData(createAddExternalIds(taxonomy)(taxonomy))
          .toPromise()
          .then(res => res.data._raw);
      }),
    );

    return {
      ...context,
      taxonomyGroupIdsByOldIds: new Map(zip(fileTaxonomies.map(t => t.id), projectTaxonomies.map(t => t.id))),
      taxonomyTermIdsByOldIds: new Map(
        zip(fileTaxonomies.flatMap(t => t.terms), projectTaxonomies.flatMap(t => t.terms)).flatMap(
          extractTermIdsEntries,
        ),
      ),
    };
  },
  deserializeEntities: JSON.parse,
  cleanEntities: async (client, taxonomies) => {
    if (!taxonomies.length) {
      return;
    }

    await serially(taxonomies.map(taxonomy => () =>
      client.deleteTaxonomy()
        .byTaxonomyId(taxonomy.id)
        .toPromise()
    ));
  },
};

const createAddExternalIds =
  (group: TaxonomyContracts.ITaxonomyContract) =>
  (taxonomy: TaxonomyContracts.ITaxonomyContract): TaxonomyContracts.ITaxonomyContract => ({
    ...taxonomy,
    external_id: taxonomy.external_id
      ?? (taxonomy === group ? group.codename : `${group.codename}_${taxonomy.codename}`),
    terms: taxonomy.terms.map(createAddExternalIds(group)),
  });

const extractTermIdsEntries = (
  [fileTaxonomy, projectTaxonomy]: readonly [TaxonomyContracts.ITaxonomyContract, TaxonomyContracts.ITaxonomyContract],
): ReadonlyArray<readonly [string, string]> => [
  [fileTaxonomy.id, projectTaxonomy.id] as const,
  ...zip(fileTaxonomy.terms, projectTaxonomy.terms).flatMap(extractTermIdsEntries),
];
