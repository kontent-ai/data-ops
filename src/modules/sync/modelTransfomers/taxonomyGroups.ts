import { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";
import { TaxonomySyncModel } from "../types/fileContentModel.js";

export const transformTaxonomyGroupsModel = (
  taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>,
): ReadonlyArray<TaxonomySyncModel> =>
  taxonomies.map(t => {
    const syncTaxonomy: TaxonomySyncModel = omit(t, ["id", "last_modified"]);
    const terms = transformTaxonomyGroupsModel(t.terms);

    return { ...syncTaxonomy, terms, external_id: t.external_id ?? t.id };
  });
