import { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { omit, removeNulls } from "../../../utils/object.js";
import { TaxonomySyncModel } from "../types/fileContentModel.js";

export const transformTaxonomyGroupsModel = (
  taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>,
  taxonomyGroupCodename: string | undefined = undefined,
): ReadonlyArray<TaxonomySyncModel> =>
  taxonomies.map(t =>
    removeNulls({
      ...omit(t, ["id", "last_modified"]),
      terms: transformTaxonomyGroupsModel(t.terms, taxonomyGroupCodename ?? t.codename),
      external_id: t.external_id ?? `${taxonomyGroupCodename ? taxonomyGroupCodename + "-" : ""}${t.codename}`,
    }) as TaxonomySyncModel
  );
