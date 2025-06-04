import type { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { omit, removeNulls } from "../../../utils/object.js";
import type { TaxonomySyncModel } from "../types/syncModel.js";

export const transformTaxonomyGroupsModel = (
  taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>,
  taxonomyGroupCodename: string | undefined = undefined,
): ReadonlyArray<TaxonomySyncModel> =>
  taxonomies.map(
    (t) =>
      removeNulls({
        ...omit(t, ["id", "last_modified", "external_id"]),
        terms: transformTaxonomyGroupsModel(t.terms, taxonomyGroupCodename ?? t.codename),
      }) as TaxonomySyncModel,
  );
