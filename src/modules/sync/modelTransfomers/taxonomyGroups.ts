import { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { extractNulls, omit } from "../../../utils/object.js";
import { TaxonomySyncModel } from "../types/fileContentModel.js";

export const transformTaxonomyGroupsModel = (
  taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>,
): ReadonlyArray<TaxonomySyncModel> =>
  taxonomies.map(t =>
    extractNulls({
      ...omit(t, ["id", "last_modified"]),
      terms: transformTaxonomyGroupsModel(t.terms),
      external_id: t.external_id ?? t.id,
    }) as TaxonomySyncModel
  );
